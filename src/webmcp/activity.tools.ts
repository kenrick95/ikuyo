import { dbAddActivity, dbUpdateActivity } from '../Activity/db';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { resolveActivityFlags } from './activityFlags';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import type { WebMCPTool } from './modelContext';
import {
  asOptLatitude,
  asOptLongitude,
  asOptNum,
  asOptStr,
  asStr,
  bool,
  epochOrIso,
  num,
  str,
  strEnum,
  toEpochMs,
} from './schema';

export function createActivityTools(): WebMCPTool[] {
  return [
    {
      name: 'activity-create',
      description:
        'Creates one focused itinerary activity. Use `isIdea: true` only for an unscheduled backlog option; a timed but tentative plan belongs on the timetable with `isIdea: false` and its uncertainty in `description`. For a mapped place, supply both WGS84 `locationLat` and `locationLng`; a location name is not geocoded automatically. Set `type` to "flight" for an airplane journey or "train" for a rail journey.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          title: str(
            'Short name for one activity, event, or location (for example, "Fushimi Inari Taisha").',
          ),
          description: str('Optional free-text description.'),
          location: str(
            'Optional primary location for this one activity; do not combine multiple stops.',
          ),
          locationLat: num(
            'WGS84 latitude (-90 to 90). Provide with locationLng for a mapped place; names are not geocoded automatically.',
          ),
          locationLng: num(
            'WGS84 longitude (-180 to 180). Provide with locationLat for a mapped place; names are not geocoded automatically.',
          ),
          locationZoom: num('Optional map zoom for the location.'),
          locationDestination: str(
            'Optional destination name (for A→B trips).',
          ),
          locationDestinationLat: num(
            'WGS84 destination latitude (-90 to 90); provide with locationDestinationLng for a mapped journey.',
          ),
          locationDestinationLng: num(
            'WGS84 destination longitude (-180 to 180); provide with locationDestinationLat for a mapped journey.',
          ),
          locationDestinationZoom: num('Optional destination map zoom.'),
          type: strEnum(
            'Activity kind: "flight" for an airplane flight, "train" for a train journey, or "activity" for a place or event (default).',
            ['activity', 'flight', 'train'],
          ),
          isIdea: bool(
            'Whether this is a tentative idea rather than a confirmed plan.',
          ),
          timestampStart: epochOrIso(
            'Optional start time (ISO-8601 string or epoch ms).',
          ),
          timestampEnd: epochOrIso(
            'Optional end time (ISO-8601 string or epoch ms).',
          ),
          timeZoneStart: str('Optional IANA time zone for start.'),
          timeZoneEnd: str('Optional IANA time zone for end.'),
          icon: str('Optional emoji icon for the activity.'),
        },
        required: ['title'],
      },
      async execute(input) {
        assertWritable('creating an activity');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const result = await dbAddActivity(
          {
            title: asStr(input.title, 'title'),
            description: (input.description as string | undefined) ?? '',
            location: asOptStr(input.location, 'location') ?? '',
            locationLat: asOptLatitude(input.locationLat, 'locationLat'),
            locationLng: asOptLongitude(input.locationLng, 'locationLng'),
            locationZoom: asOptNum(input.locationZoom, 'locationZoom'),
            locationDestination:
              asOptStr(input.locationDestination, 'locationDestination') ?? '',
            locationDestinationLat: asOptLatitude(
              input.locationDestinationLat,
              'locationDestinationLat',
            ),
            locationDestinationLng: asOptLongitude(
              input.locationDestinationLng,
              'locationDestinationLng',
            ),
            locationDestinationZoom: asOptNum(
              input.locationDestinationZoom,
              'locationDestinationZoom',
            ),
            timestampStart: toEpochMs(input.timestampStart, 'timestampStart'),
            timestampEnd: toEpochMs(input.timestampEnd, 'timestampEnd'),
            timeZoneStart:
              asOptStr(input.timeZoneStart, 'timeZoneStart') ?? null,
            timeZoneEnd: asOptStr(input.timeZoneEnd, 'timeZoneEnd') ?? null,
            flags: resolveActivityFlags(undefined, input.type, input.isIdea),
            icon: asOptStr(input.icon, 'icon') ?? null,
          },
          { tripId },
        );
        return { ok: true, id: result.id, activityId: result.id };
      },
    },
    {
      name: 'activity-get',
      description: 'Returns an activity from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: {
          activityId: str('The activity id.'),
        },
        required: ['activityId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.activityId, 'activityId');
        const activity = useBoundStore.getState().activity[id];
        if (!activity) throw new Error(`Activity ${id} is not loaded.`);
        return { ok: true, activity };
      },
    },
    {
      name: 'activity-update',
      description:
        'Updates an existing activity. `isIdea: true` means an unscheduled backlog option, not a tentative timetable entry. Use WGS84 coordinate pairs to map locations; names are not geocoded automatically.',
      inputSchema: {
        type: 'object',
        properties: {
          activityId: str('The activity id.'),
          title: str('New title.'),
          description: str('New description.'),
          location: str('New location name.'),
          locationLat: num('New location latitude.'),
          locationLng: num('New location longitude.'),
          locationZoom: num('New location map zoom.'),
          locationDestination: str('New destination name.'),
          locationDestinationLat: num('New destination latitude.'),
          locationDestinationLng: num('New destination longitude.'),
          locationDestinationZoom: num('New destination map zoom.'),
          timestampStart: epochOrIso('New start time (ISO-8601 or epoch ms).'),
          timestampEnd: epochOrIso('New end time (ISO-8601 or epoch ms).'),
          timeZoneStart: str('New IANA start time zone.'),
          timeZoneEnd: str('New IANA end time zone.'),
          type: strEnum(
            'Activity kind: "flight" for an airplane flight, "train" for a train journey, or "activity" for a place or event.',
            ['activity', 'flight', 'train'],
          ),
          isIdea: bool(
            'Whether this is a tentative idea rather than a confirmed plan.',
          ),
          icon: str('New emoji icon.'),
        },
        required: ['activityId'],
      },
      async execute(input) {
        assertWritable('updating an activity');
        requireAuthUser();
        const id = asStr(input.activityId, 'activityId');
        const existing = useBoundStore.getState().activity[id];
        if (!existing) throw new Error(`Activity ${id} is not loaded.`);
        await dbUpdateActivity({
          id,
          title: (input.title as string | undefined) ?? existing.title,
          description:
            (input.description as string | undefined) ?? existing.description,
          location: asOptStr(input.location, 'location') ?? existing.location,
          locationLat:
            asOptLatitude(input.locationLat, 'locationLat') ??
            existing.locationLat,
          locationLng:
            asOptLongitude(input.locationLng, 'locationLng') ??
            existing.locationLng,
          locationZoom:
            asOptNum(input.locationZoom, 'locationZoom') ??
            existing.locationZoom,
          locationDestination:
            asOptStr(input.locationDestination, 'locationDestination') ??
            existing.locationDestination,
          locationDestinationLat:
            asOptLatitude(
              input.locationDestinationLat,
              'locationDestinationLat',
            ) ?? existing.locationDestinationLat,
          locationDestinationLng:
            asOptLongitude(
              input.locationDestinationLng,
              'locationDestinationLng',
            ) ?? existing.locationDestinationLng,
          locationDestinationZoom:
            asOptNum(
              input.locationDestinationZoom,
              'locationDestinationZoom',
            ) ?? existing.locationDestinationZoom,
          timestampStart:
            toEpochMs(input.timestampStart, 'timestampStart') ??
            existing.timestampStart,
          timestampEnd:
            toEpochMs(input.timestampEnd, 'timestampEnd') ??
            existing.timestampEnd,
          timeZoneStart:
            asOptStr(input.timeZoneStart, 'timeZoneStart') ??
            existing.timeZoneStart,
          timeZoneEnd:
            asOptStr(input.timeZoneEnd, 'timeZoneEnd') ?? existing.timeZoneEnd,
          flags: resolveActivityFlags(existing.flags, input.type, input.isIdea),
          icon: asOptStr(input.icon, 'icon') ?? existing.icon,
        });
        return { ok: true, activityId: id };
      },
    },
  ];
}
