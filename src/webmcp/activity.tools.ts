import { dbAddActivity, dbUpdateActivity } from '../Activity/db';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { resolveActivityFlags } from './activityFlags';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
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

const PLANNING_STATUSES = ['planned', 'tentative', 'confirmed'];

function activityProperties() {
  return {
    tripId: str('Trip id. Defaults to the current WebMCP trip context.'),
    idempotencyKey: idempotencyKeySchema(),
    dayPlanId: str(
      'Optional day-plan id to explicitly attach this activity to. The day plan must belong to the same trip.',
    ),
    planningStatus: strEnum(
      'Schedule confidence, separate from placement: planned, tentative, or confirmed. Default planned.',
      PLANNING_STATUSES,
    ),
    title: str('Short name for one activity, event, or location.'),
    description: str(
      'Optional free-text description; record uncertainty and source notes here.',
    ),
    location: str('Optional primary location; text alone is not geocoded.'),
    locationLat: num('WGS84 latitude; provide together with locationLng.'),
    locationLng: num('WGS84 longitude; provide together with locationLat.'),
    locationZoom: num('Optional map zoom for the location.'),
    locationDestination: str('Optional destination name (for A→B trips).'),
    locationDestinationLat: num(
      'WGS84 destination latitude; provide with destination longitude.',
    ),
    locationDestinationLng: num(
      'WGS84 destination longitude; provide with destination latitude.',
    ),
    locationDestinationZoom: num('Optional destination map zoom.'),
    type: strEnum('Activity, airplane flight, or train journey.', [
      'activity',
      'flight',
      'train',
    ]),
    isIdea: bool(
      'True only for an unscheduled backlog option intentionally absent from the timetable; default false.',
    ),
    timestampStart: epochOrIso('Optional start time (ISO-8601 or epoch ms).'),
    timestampEnd: epochOrIso('Optional end time (ISO-8601 or epoch ms).'),
    timeZoneStart: str('Optional IANA time zone for start.'),
    timeZoneEnd: str('Optional IANA time zone for end.'),
    icon: str('Optional emoji icon for the activity.'),
  };
}

function parseActivity(input: Record<string, unknown>) {
  const tripId = resolveTripId(input.tripId);
  requireLoadedTrip(tripId);
  const start = toEpochMs(input.timestampStart, 'timestampStart');
  const end = toEpochMs(input.timestampEnd, 'timestampEnd');
  const lat = asOptLatitude(input.locationLat, 'locationLat');
  const lng = asOptLongitude(input.locationLng, 'locationLng');
  const destinationLat = asOptLatitude(
    input.locationDestinationLat,
    'locationDestinationLat',
  );
  const destinationLng = asOptLongitude(
    input.locationDestinationLng,
    'locationDestinationLng',
  );
  if ((lat === undefined) !== (lng === undefined)) {
    throw new Error('locationLat and locationLng must be supplied together');
  }
  if ((destinationLat === undefined) !== (destinationLng === undefined)) {
    throw new Error(
      'locationDestinationLat and locationDestinationLng must be supplied together',
    );
  }
  if (start != null && end != null && end < start) {
    throw new Error('timestampEnd must be at or after timestampStart');
  }
  const isIdea = input.isIdea === true;
  if (isIdea && (start != null || end != null)) {
    throw new Error(
      'isIdea true is only for an unscheduled backlog option; remove its timestamps or set isIdea false',
    );
  }
  const dayPlanId = asOptStr(input.dayPlanId, 'dayPlanId') ?? null;
  if (dayPlanId) {
    const dayPlan = useBoundStore.getState().macroplan[dayPlanId];
    if (!dayPlan || dayPlan.tripId !== tripId) {
      throw new Error('dayPlanId must identify a loaded day plan in this trip');
    }
  }
  const planningStatus =
    asOptStr(input.planningStatus, 'planningStatus') ?? 'planned';
  if (!PLANNING_STATUSES.includes(planningStatus)) {
    throw new Error(
      `planningStatus must be one of ${PLANNING_STATUSES.join(', ')}`,
    );
  }
  return {
    tripId,
    data: {
      dayPlanId,
      planningStatus: planningStatus as 'planned' | 'tentative' | 'confirmed',
      title: asStr(input.title, 'title'),
      description: (input.description as string | undefined) ?? '',
      location: asOptStr(input.location, 'location') ?? '',
      locationLat: lat,
      locationLng: lng,
      locationZoom: asOptNum(input.locationZoom, 'locationZoom'),
      locationDestination:
        asOptStr(input.locationDestination, 'locationDestination') ?? '',
      locationDestinationLat: destinationLat,
      locationDestinationLng: destinationLng,
      locationDestinationZoom: asOptNum(
        input.locationDestinationZoom,
        'locationDestinationZoom',
      ),
      timestampStart: start,
      timestampEnd: end,
      timeZoneStart: asOptStr(input.timeZoneStart, 'timeZoneStart') ?? null,
      timeZoneEnd: asOptStr(input.timeZoneEnd, 'timeZoneEnd') ?? null,
      flags: resolveActivityFlags(undefined, input.type, input.isIdea),
      icon: asOptStr(input.icon, 'icon') ?? null,
    },
  };
}

async function createActivity(input: Record<string, unknown>) {
  const parsed = parseActivity(input);
  return runIdempotent(
    'activity-create',
    parsed.tripId,
    input.idempotencyKey,
    input,
    async () => {
      const result = await dbAddActivity(parsed.data, {
        tripId: parsed.tripId,
      });
      return {
        ok: true,
        id: result.id,
        activityId: result.id,
        mapped:
          parsed.data.locationLat != null && parsed.data.locationLng != null,
        dayPlanId: parsed.data.dayPlanId,
        planningStatus: parsed.data.planningStatus,
      };
    },
  );
}

export function createActivityTools(): WebMCPTool[] {
  return [
    {
      name: 'activity-create',
      description:
        'Creates one focused itinerary activity. Use `isIdea: true` only for an unscheduled backlog option; a timed but tentative plan belongs on the timetable with `isIdea: false` and its uncertainty in `description`. For a mapped place, supply both WGS84 `locationLat` and `locationLng`; a location name is not geocoded automatically. Set `type` to "flight" for an airplane journey or "train" for a rail journey.',
      inputSchema: {
        type: 'object',
        properties: activityProperties(),
        required: ['title'],
      },
      async execute(input) {
        assertWritable('creating an activity');
        requireAuthUser();
        return createActivity(input);
      },
    },
    {
      name: 'activity-create-many',
      description:
        'Creates up to 50 activities. Every item is validated before the first write. Writes are ordered and non-atomic; on interruption the result identifies the committed prefix, and item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id applied to items that omit tripId.'),
          activities: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Ordered activities to create.',
            items: {
              type: 'object',
              properties: activityProperties(),
              required: ['title'],
            },
          },
        },
        required: ['activities'],
      },
      async execute(input) {
        assertWritable('creating activities');
        requireAuthUser();
        if (
          !Array.isArray(input.activities) ||
          input.activities.length < 1 ||
          input.activities.length > 50
        ) {
          throw new Error('activities must contain between 1 and 50 items');
        }
        const items = input.activities.map((item, index) => {
          if (!item || typeof item !== 'object')
            throw new Error(`activities[${index}] must be an object`);
          const merged = {
            tripId: input.tripId,
            ...(item as Record<string, unknown>),
          };
          parseActivity(merged);
          return merged;
        });
        const results: Array<Record<string, unknown>> = [];
        for (let index = 0; index < items.length; index++) {
          try {
            results.push(await createActivity(items[index]));
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
          dayPlanId: str(
            'New day-plan membership id; use an empty string to detach it.',
          ),
          planningStatus: strEnum(
            'New schedule confidence, separate from idea/timetable placement.',
            PLANNING_STATUSES,
          ),
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
        const dayPlanId = asOptStr(input.dayPlanId, 'dayPlanId');
        if (dayPlanId) {
          const dayPlan = useBoundStore.getState().macroplan[dayPlanId];
          if (!dayPlan || dayPlan.tripId !== existing.tripId) {
            throw new Error(
              'dayPlanId must identify a loaded day plan in this trip',
            );
          }
        }
        const planningStatus = asOptStr(input.planningStatus, 'planningStatus');
        if (planningStatus && !PLANNING_STATUSES.includes(planningStatus)) {
          throw new Error(
            `planningStatus must be one of ${PLANNING_STATUSES.join(', ')}`,
          );
        }
        const timestampStart = toEpochMs(
          input.timestampStart,
          'timestampStart',
        );
        const timestampEnd = toEpochMs(input.timestampEnd, 'timestampEnd');
        const nextTimestampStart =
          timestampStart !== undefined
            ? timestampStart
            : existing.timestampStart;
        const nextTimestampEnd =
          timestampEnd !== undefined ? timestampEnd : existing.timestampEnd;
        if (
          input.isIdea === true &&
          (nextTimestampStart != null || nextTimestampEnd != null)
        ) {
          throw new Error(
            'isIdea true is only for an unscheduled backlog option; clear timestampStart and timestampEnd with null',
          );
        }
        if (
          nextTimestampStart != null &&
          nextTimestampEnd != null &&
          nextTimestampEnd < nextTimestampStart
        ) {
          throw new Error('timestampEnd must be at or after timestampStart');
        }
        await dbUpdateActivity({
          id,
          dayPlanId:
            input.dayPlanId !== undefined ? dayPlanId : existing.dayPlanId,
          planningStatus:
            (planningStatus as
              | 'planned'
              | 'tentative'
              | 'confirmed'
              | undefined) ?? existing.planningStatus,
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
          timestampStart: nextTimestampStart,
          timestampEnd: nextTimestampEnd,
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
