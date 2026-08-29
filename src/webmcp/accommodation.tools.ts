import {
  dbAddAccommodation,
  dbDeleteAccommodation,
  dbUpdateAccommodation,
} from '../Accommodation/db';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import {
  deletionConfirmationSchema,
  requireDeletionConfirmation,
} from './destructive';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import { asOptPlaceCandidate, placeCandidateSchema } from './placeCandidate';
import {
  asOptLatitude,
  asOptLongitude,
  asOptNum,
  asOptStr,
  asStr,
  epochOrIso,
  num,
  str,
  toEpochMs,
} from './schema';

export function createAccommodationTools(): WebMCPTool[] {
  return [
    {
      name: 'accommodation-create',
      description:
        'Creates a lodging entry. Always use this—not activity-create—for a hotel, hostel, ryokan, or other overnight stay, including tentative recommendations and shortlists. If check-in and check-out are both omitted, the loaded trip bounds are used. Put recommendation or booking status in notes. For a mapped hotel, first call place-search and pass the selected candidate.place object through `place`.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          idempotencyKey: idempotencyKeySchema(),
          name: str('Accommodation name.'),
          address: str('Optional street address.'),
          place: placeCandidateSchema(),
          checkIn: epochOrIso('Check-in time (ISO-8601 or epoch ms).'),
          checkOut: epochOrIso('Check-out time (ISO-8601 or epoch ms).'),
          phoneNumber: str('Optional phone number.'),
          notes: str('Optional notes.'),
          locationLat: num(
            'WGS84 latitude (-90 to 90). Provide with locationLng to map this accommodation; address is not geocoded automatically.',
          ),
          locationLng: num(
            'WGS84 longitude (-180 to 180). Provide with locationLat to map this accommodation; address is not geocoded automatically.',
          ),
          locationZoom: num('Optional map zoom.'),
          timeZoneCheckIn: str('Optional IANA time zone for check-in.'),
          timeZoneCheckOut: str('Optional IANA time zone for check-out.'),
        },
        required: ['name'],
      },
      async execute(input) {
        assertWritable('creating an accommodation');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const trip = useBoundStore.getState().trip[tripId];
        const inputCheckIn = toEpochMs(input.checkIn, 'checkIn');
        const inputCheckOut = toEpochMs(input.checkOut, 'checkOut');
        if (
          (inputCheckIn == null) !== (inputCheckOut == null) &&
          (inputCheckIn !== undefined || inputCheckOut !== undefined)
        ) {
          throw new Error(
            'Provide both checkIn and checkOut, or omit both to use the loaded trip bounds',
          );
        }
        const checkIn = inputCheckIn ?? trip.timestampStart;
        const checkOut = inputCheckOut ?? trip.timestampEnd;
        const place = asOptPlaceCandidate(input.place);
        const manualLocationLat = asOptLatitude(
          input.locationLat,
          'locationLat',
        );
        const manualLocationLng = asOptLongitude(
          input.locationLng,
          'locationLng',
        );
        if (
          place &&
          (manualLocationLat !== undefined || manualLocationLng !== undefined)
        ) {
          throw new Error(
            'Use either place-search `place` or manual locationLat/locationLng, not both',
          );
        }
        const locationLat = place?.latitude ?? manualLocationLat;
        const locationLng = place?.longitude ?? manualLocationLng;
        if ((locationLat === undefined) !== (locationLng === undefined)) {
          throw new Error(
            'locationLat and locationLng must be supplied together',
          );
        }
        if (checkOut <= checkIn) {
          throw new Error('checkOut must be after checkIn');
        }
        const data = {
          name: asStr(input.name, 'name'),
          address: asOptStr(input.address, 'address') ?? place?.label ?? '',
          timestampCheckIn: checkIn,
          timestampCheckOut: checkOut,
          phoneNumber: asOptStr(input.phoneNumber, 'phoneNumber') ?? '',
          notes: asOptStr(input.notes, 'notes') ?? '',
          locationLat,
          locationLng,
          locationZoom:
            place?.zoom ?? asOptNum(input.locationZoom, 'locationZoom'),
          timeZoneCheckIn:
            asOptStr(input.timeZoneCheckIn, 'timeZoneCheckIn') ?? trip.timeZone,
          timeZoneCheckOut:
            asOptStr(input.timeZoneCheckOut, 'timeZoneCheckOut') ??
            trip.timeZone,
        };
        return runIdempotent(
          'accommodation-create',
          tripId,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddAccommodation(data, { tripId });
            return {
              ok: true,
              id: result.id,
              accommodationId: result.id,
              mapped: locationLat != null && locationLng != null,
              datesDefaulted: inputCheckIn == null && inputCheckOut == null,
              nextAction:
                locationLat == null || locationLng == null
                  ? 'This lodging is unmapped. Call place-search, choose a candidate, and pass candidate.place to accommodation-update.'
                  : undefined,
            };
          },
        );
      },
    },
    {
      name: 'accommodation-create-many',
      description:
        'Creates up to 50 lodging entries for confirmed or planned stays. Each item is processed in order and may use place-search `place` coordinates. Writes are non-atomic; per-item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id applied to lodgings that omit tripId.'),
          accommodations: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Ordered lodging entries to create.',
            items: {
              type: 'object',
              properties: {
                idempotencyKey: idempotencyKeySchema(),
                name: str('Accommodation name.'),
                address: str('Optional street address.'),
                place: placeCandidateSchema(),
                checkIn: epochOrIso('Check-in time (ISO-8601 or epoch ms).'),
                checkOut: epochOrIso('Check-out time (ISO-8601 or epoch ms).'),
                phoneNumber: str('Optional phone number.'),
                notes: str('Optional notes.'),
                locationLat: num('WGS84 latitude (-90 to 90).'),
                locationLng: num('WGS84 longitude (-180 to 180).'),
                locationZoom: num('Optional map zoom.'),
                timeZoneCheckIn: str('Optional IANA time zone for check-in.'),
                timeZoneCheckOut: str('Optional IANA time zone for check-out.'),
              },
              required: ['name'],
            },
          },
        },
        required: ['accommodations'],
      },
      async execute(input) {
        assertWritable('creating accommodations');
        requireAuthUser();
        if (
          !Array.isArray(input.accommodations) ||
          input.accommodations.length < 1 ||
          input.accommodations.length > 50
        ) {
          throw new Error('accommodations must contain between 1 and 50 items');
        }
        const createOne = createAccommodationTools().find(
          (tool) => tool.name === 'accommodation-create',
        );
        if (!createOne) throw new Error('accommodation-create is unavailable');
        const results: Array<Record<string, unknown>> = [];
        for (let index = 0; index < input.accommodations.length; index++) {
          const item = input.accommodations[index];
          if (!item || typeof item !== 'object')
            throw new Error(`accommodations[${index}] must be an object`);
          try {
            results.push(
              (await createOne.execute({
                tripId: input.tripId,
                ...(item as Record<string, unknown>),
              })) as Record<string, unknown>,
            );
          } catch (error) {
            return {
              ok: false,
              atomic: false,
              committedCount: results.length,
              failedIndex: index,
              results,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        }
        return {
          ok: true,
          atomic: false,
          committedCount: results.length,
          results,
        };
      },
    },
    {
      name: 'accommodation-delete',
      description:
        'Destructive: permanently deletes one accommodation stay from the trip. Call only after the user explicitly confirms the exact lodging deletion.',
      inputSchema: {
        type: 'object',
        properties: {
          accommodationId: str('The accommodation id to permanently delete.'),
          confirmDelete: deletionConfirmationSchema(),
        },
        required: ['accommodationId', 'confirmDelete'],
      },
      async execute(input) {
        assertWritable('deleting an accommodation');
        requireAuthUser();
        const accommodationId = asStr(input.accommodationId, 'accommodationId');
        if (!useBoundStore.getState().accommodation[accommodationId])
          throw new Error(`Accommodation ${accommodationId} is not loaded.`);
        requireDeletionConfirmation(input.confirmDelete);
        await dbDeleteAccommodation(accommodationId);
        return { ok: true, deletedAccommodationId: accommodationId };
      },
    },
    {
      name: 'accommodation-get',
      description:
        'Returns an accommodation from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: {
          accommodationId: str('The accommodation id.'),
        },
        required: ['accommodationId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.accommodationId, 'accommodationId');
        const a = useBoundStore.getState().accommodation[id];
        if (!a) throw new Error(`Accommodation ${id} is not loaded.`);
        return { ok: true, accommodation: a };
      },
    },
    {
      name: 'accommodation-update',
      description:
        'Updates a lodging entry. For a mapped hotel, first call place-search and pass the selected candidate.place object through `place`.',
      inputSchema: {
        type: 'object',
        properties: {
          accommodationId: str('The accommodation id.'),
          name: str('New name.'),
          address: str('New address.'),
          place: placeCandidateSchema(),
          checkIn: epochOrIso('New check-in time (ISO-8601 or epoch ms).'),
          checkOut: epochOrIso('New check-out time (ISO-8601 or epoch ms).'),
          phoneNumber: str('New phone number.'),
          notes: str('New notes.'),
          locationLat: num('New latitude.'),
          locationLng: num('New longitude.'),
          locationZoom: num('New map zoom.'),
          timeZoneCheckIn: str('New IANA check-in time zone.'),
          timeZoneCheckOut: str('New IANA check-out time zone.'),
        },
        required: ['accommodationId'],
      },
      async execute(input) {
        assertWritable('updating an accommodation');
        requireAuthUser();
        const id = asStr(input.accommodationId, 'accommodationId');
        const existing = useBoundStore.getState().accommodation[id];
        if (!existing) throw new Error(`Accommodation ${id} is not loaded.`);
        const place = asOptPlaceCandidate(input.place);
        if (
          place &&
          (input.locationLat !== undefined || input.locationLng !== undefined)
        ) {
          throw new Error(
            'Use either place-search `place` or manual locationLat/locationLng, not both',
          );
        }
        await dbUpdateAccommodation({
          id,
          name: (input.name as string | undefined) ?? existing.name,
          address:
            asOptStr(input.address, 'address') ??
            place?.label ??
            existing.address,
          timestampCheckIn:
            toEpochMs(input.checkIn, 'checkIn') ?? existing.timestampCheckIn,
          timestampCheckOut:
            toEpochMs(input.checkOut, 'checkOut') ?? existing.timestampCheckOut,
          phoneNumber:
            asOptStr(input.phoneNumber, 'phoneNumber') ?? existing.phoneNumber,
          notes: asOptStr(input.notes, 'notes') ?? existing.notes,
          locationLat:
            place?.latitude ??
            asOptLatitude(input.locationLat, 'locationLat') ??
            existing.locationLat,
          locationLng:
            place?.longitude ??
            asOptLongitude(input.locationLng, 'locationLng') ??
            existing.locationLng,
          locationZoom:
            place?.zoom ??
            asOptNum(input.locationZoom, 'locationZoom') ??
            existing.locationZoom,
          timeZoneCheckIn:
            asOptStr(input.timeZoneCheckIn, 'timeZoneCheckIn') ??
            existing.timeZoneCheckIn,
          timeZoneCheckOut:
            asOptStr(input.timeZoneCheckOut, 'timeZoneCheckOut') ??
            existing.timeZoneCheckOut,
        });
        return { ok: true, accommodationId: id };
      },
    },
  ];
}
