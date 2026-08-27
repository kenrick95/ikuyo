import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { dbAddMacroplan, dbUpdateMacroplan } from '../Macroplan/db';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import { asOptStr, asStr, str } from './schema';

/** Midnight (00:00) of a YYYY-MM-DD date in a time zone, as epoch ms. */
function dayStart(isoDate: string, timeZone: string, addDays = 0): number {
  return Temporal.PlainDate.from(isoDate)
    .add({ days: addDays })
    .toZonedDateTime({
      timeZone,
      plainTime: Temporal.PlainTime.from('00:00'),
    }).epochMilliseconds;
}

function dayPlanProperties() {
  return {
    tripId: str('Trip id. Defaults to the current WebMCP trip context.'),
    idempotencyKey: idempotencyKeySchema(),
    name: str('Day plan name (for example, "Kyoto day trip").'),
    notes: str('Optional overview, pacing, or transport notes for the day.'),
    startDate: str('First day covered by this plan (YYYY-MM-DD).'),
    endDate: str(
      'Last day covered (YYYY-MM-DD); use the same date for one day.',
    ),
    timeZone: str('IANA time zone; defaults to the trip time zone.'),
  };
}

function parseDayPlan(input: Record<string, unknown>) {
  const tripId = resolveTripId(input.tripId);
  requireLoadedTrip(tripId);
  const trip = useBoundStore.getState().trip[tripId];
  const timeZone = asOptStr(input.timeZone, 'timeZone') ?? trip.timeZone;
  const start = asStr(input.startDate, 'startDate');
  const end = asStr(input.endDate, 'endDate');
  const timestampStart = dayStart(start, timeZone);
  const timestampEnd = dayStart(end, timeZone, 1);
  if (timestampEnd <= timestampStart) {
    throw new Error('endDate must be on or after startDate');
  }
  return {
    tripId,
    data: {
      name: asStr(input.name, 'name'),
      notes: asOptStr(input.notes, 'notes') ?? '',
      timestampStart,
      timestampEnd,
      timeZoneStart: timeZone,
      timeZoneEnd: timeZone,
    },
  };
}

async function createDayPlan(input: Record<string, unknown>) {
  const parsed = parseDayPlan(input);
  return runIdempotent(
    'day-plan-create',
    parsed.tripId,
    input.idempotencyKey,
    input,
    async () => {
      const result = await dbAddMacroplan(parsed.data, {
        tripId: parsed.tripId,
      });
      return { ok: true, id: result.id, dayPlanId: result.id };
    },
  );
}

export function createMacroplanTools(): WebMCPTool[] {
  return [
    {
      name: 'day-plan-create',
      description:
        "Creates a day plan (stored internally as a macroplan) for one or more whole travel days. For an itinerary, create one day plan per day before adding activities; use the same startDate and endDate for a single-day plan. A day plan groups the day's focused activities rather than replacing them.",
      inputSchema: {
        type: 'object',
        properties: dayPlanProperties(),
        required: ['name', 'startDate', 'endDate'],
      },
      async execute(input) {
        assertWritable('creating a macroplan');
        requireAuthUser();
        return createDayPlan(input);
      },
    },
    {
      name: 'day-plan-create-many',
      description:
        'Creates up to 31 day plans. All input is validated before writing. Writes are ordered and non-atomic; partial failures identify the committed prefix, and per-item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id applied to items that omit tripId.'),
          dayPlans: {
            type: 'array',
            minItems: 1,
            maxItems: 31,
            description: 'Ordered day plans to create.',
            items: {
              type: 'object',
              properties: dayPlanProperties(),
              required: ['name', 'startDate', 'endDate'],
            },
          },
        },
        required: ['dayPlans'],
      },
      async execute(input) {
        assertWritable('creating day plans');
        requireAuthUser();
        if (
          !Array.isArray(input.dayPlans) ||
          input.dayPlans.length < 1 ||
          input.dayPlans.length > 31
        ) {
          throw new Error('dayPlans must contain between 1 and 31 items');
        }
        const items = input.dayPlans.map((item, index) => {
          if (!item || typeof item !== 'object')
            throw new Error(`dayPlans[${index}] must be an object`);
          const merged = {
            tripId: input.tripId,
            ...(item as Record<string, unknown>),
          };
          parseDayPlan(merged);
          return merged;
        });
        const results: Array<Record<string, unknown>> = [];
        for (let index = 0; index < items.length; index++) {
          try {
            results.push(await createDayPlan(items[index]));
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
      name: 'day-plan-get',
      description:
        'Returns a day plan from the locally loaded state by id. Day plans are stored internally as macroplans.',
      inputSchema: {
        type: 'object',
        properties: {
          dayPlanId: str('The day plan id.'),
        },
        required: ['dayPlanId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.dayPlanId, 'dayPlanId');
        const m = useBoundStore.getState().macroplan[id];
        if (!m) throw new Error(`Macroplan ${id} is not loaded.`);
        const activityIds = Object.values(useBoundStore.getState().activity)
          .filter((activity) => activity.dayPlanId === id)
          .map((activity) => activity.id);
        return { ok: true, dayPlan: { ...m, activityIds } };
      },
    },
    {
      name: 'day-plan-update',
      description:
        "Updates a day plan's name, overview notes, or covered dates. Only provided fields are changed.",
      inputSchema: {
        type: 'object',
        properties: {
          dayPlanId: str('The day plan id.'),
          name: str('New day plan name.'),
          notes: str('New overview, pacing, or transport notes.'),
          startDate: str('New first day (YYYY-MM-DD).'),
          endDate: str('New last day (YYYY-MM-DD).'),
          timeZone: str('New IANA time zone.'),
        },
        required: ['dayPlanId'],
      },
      async execute(input) {
        assertWritable('updating a macroplan');
        requireAuthUser();
        const id = asStr(input.dayPlanId, 'dayPlanId');
        const existing = useBoundStore.getState().macroplan[id];
        if (!existing) throw new Error(`Macroplan ${id} is not loaded.`);
        const timeZone =
          asOptStr(input.timeZone, 'timeZone') ??
          existing.timeZoneStart ??
          'UTC';
        const timestampStart =
          input.startDate !== undefined
            ? dayStart(asStr(input.startDate, 'startDate'), timeZone)
            : existing.timestampStart;
        const timestampEnd =
          input.endDate !== undefined
            ? dayStart(asStr(input.endDate, 'endDate'), timeZone, 1)
            : existing.timestampEnd;
        await dbUpdateMacroplan({
          id,
          name: (input.name as string | undefined) ?? existing.name,
          notes: asOptStr(input.notes, 'notes') ?? existing.notes,
          timestampStart,
          timestampEnd,
          timeZoneStart: timeZone,
          timeZoneEnd: timeZone,
        });
        return { ok: true, dayPlanId: id };
      },
    },
  ];
}
