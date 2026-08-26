import { dbAddActivity, dbUpdateActivity } from '../Activity/db';
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

export function createActivityTools(): WebMCPTool[] {
  return [
    {
      name: 'activity-create',
      description:
        'Creates an activity in a trip. Provide at least a title; dates are optional ISO-8601 (or epoch ms). location may include lat/lng/zoom.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          title: str('Activity title.'),
          description: str('Optional free-text description.'),
          location: str('Optional location / origin name.'),
          locationLat: num('Optional latitude of the location.'),
          locationLng: num('Optional longitude of the location.'),
          locationZoom: num('Optional map zoom for the location.'),
          locationDestination: str(
            'Optional destination name (for A→B trips).',
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
            locationLat: asOptNum(input.locationLat, 'locationLat'),
            locationLng: asOptNum(input.locationLng, 'locationLng'),
            locationZoom: asOptNum(input.locationZoom, 'locationZoom'),
            locationDestination:
              asOptStr(input.locationDestination, 'locationDestination') ?? '',
            locationDestinationLat: asOptNum(
              input.locationDestinationLat,
              'locationDestinationLat',
            ),
            locationDestinationLng: asOptNum(
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
            flags: input.flags ? Number(input.flags) : undefined,
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
        'Updates an existing activity. Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          activityId: str('The activity id.'),
          title: str('New title.'),
          description: str('New description.'),
          location: str('New location name.'),
          timestampStart: epochOrIso('New start time (ISO-8601 or epoch ms).'),
          timestampEnd: epochOrIso('New end time (ISO-8601 or epoch ms).'),
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
            asOptNum(input.locationLat, 'locationLat') ?? existing.locationLat,
          locationLng:
            asOptNum(input.locationLng, 'locationLng') ?? existing.locationLng,
          locationZoom:
            asOptNum(input.locationZoom, 'locationZoom') ??
            existing.locationZoom,
          locationDestination:
            asOptStr(input.locationDestination, 'locationDestination') ??
            existing.locationDestination,
          locationDestinationLat:
            asOptNum(input.locationDestinationLat, 'locationDestinationLat') ??
            existing.locationDestinationLat,
          locationDestinationLng:
            asOptNum(input.locationDestinationLng, 'locationDestinationLng') ??
            existing.locationDestinationLng,
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
          flags:
            input.flags !== undefined
              ? Number(input.flags)
              : (existing.flags ?? undefined),
          icon: asOptStr(input.icon, 'icon') ?? existing.icon,
        });
        return { ok: true, activityId: id };
      },
    },
  ];
}
