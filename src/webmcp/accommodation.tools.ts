import { dbAddAccommodation, dbUpdateAccommodation } from '../Accommodation/db';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import type { WebMCPTool } from './modelContext';
import {
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
        'Creates a lodging/accommodation in a trip. Requires a name, check-in time, and check-out time.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          name: str('Accommodation name.'),
          address: str('Optional street address.'),
          checkIn: epochOrIso('Check-in time (ISO-8601 or epoch ms).'),
          checkOut: epochOrIso('Check-out time (ISO-8601 or epoch ms).'),
          phoneNumber: str('Optional phone number.'),
          notes: str('Optional notes.'),
          locationLat: num('Optional latitude.'),
          locationLng: num('Optional longitude.'),
          timeZoneCheckIn: str('Optional IANA time zone for check-in.'),
          timeZoneCheckOut: str('Optional IANA time zone for check-out.'),
        },
        required: ['name', 'checkIn', 'checkOut'],
      },
      async execute(input) {
        assertWritable('creating an accommodation');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const checkIn = toEpochMs(input.checkIn, 'checkIn');
        const checkOut = toEpochMs(input.checkOut, 'checkOut');
        if (checkIn == null || checkOut == null) {
          throw new Error(
            'checkIn and checkOut are required dates for an accommodation',
          );
        }
        const result = await dbAddAccommodation(
          {
            name: asStr(input.name, 'name'),
            address: asOptStr(input.address, 'address') ?? '',
            timestampCheckIn: checkIn,
            timestampCheckOut: checkOut,
            phoneNumber: asOptStr(input.phoneNumber, 'phoneNumber') ?? '',
            notes: asOptStr(input.notes, 'notes') ?? '',
            locationLat: asOptNum(input.locationLat, 'locationLat'),
            locationLng: asOptNum(input.locationLng, 'locationLng'),
            locationZoom: asOptNum(input.locationZoom, 'locationZoom'),
            timeZoneCheckIn:
              asOptStr(input.timeZoneCheckIn, 'timeZoneCheckIn') ?? null,
            timeZoneCheckOut:
              asOptStr(input.timeZoneCheckOut, 'timeZoneCheckOut') ?? null,
          },
          { tripId },
        );
        return { ok: true, id: result.id, accommodationId: result.id };
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
        'Updates an existing accommodation. Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          accommodationId: str('The accommodation id.'),
          name: str('New name.'),
          address: str('New address.'),
          checkIn: epochOrIso('New check-in time (ISO-8601 or epoch ms).'),
          checkOut: epochOrIso('New check-out time (ISO-8601 or epoch ms).'),
          phoneNumber: str('New phone number.'),
          notes: str('New notes.'),
        },
        required: ['accommodationId'],
      },
      async execute(input) {
        assertWritable('updating an accommodation');
        requireAuthUser();
        const id = asStr(input.accommodationId, 'accommodationId');
        const existing = useBoundStore.getState().accommodation[id];
        if (!existing) throw new Error(`Accommodation ${id} is not loaded.`);
        await dbUpdateAccommodation({
          id,
          name: (input.name as string | undefined) ?? existing.name,
          address: asOptStr(input.address, 'address') ?? existing.address,
          timestampCheckIn:
            toEpochMs(input.checkIn, 'checkIn') ?? existing.timestampCheckIn,
          timestampCheckOut:
            toEpochMs(input.checkOut, 'checkOut') ?? existing.timestampCheckOut,
          phoneNumber:
            asOptStr(input.phoneNumber, 'phoneNumber') ?? existing.phoneNumber,
          notes: asOptStr(input.notes, 'notes') ?? existing.notes,
          locationLat:
            asOptNum(input.locationLat, 'locationLat') ?? existing.locationLat,
          locationLng:
            asOptNum(input.locationLng, 'locationLng') ?? existing.locationLng,
          locationZoom:
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
