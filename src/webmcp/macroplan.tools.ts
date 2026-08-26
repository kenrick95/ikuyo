import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { dbAddMacroplan, dbUpdateMacroplan } from '../Macroplan/db';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
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

export function createMacroplanTools(): WebMCPTool[] {
  return [
    {
      name: 'day-plan-create',
      description:
        "Creates a day plan (stored internally as a macroplan) for one or more whole travel days. For an itinerary, create one day plan per day before adding activities; use the same startDate and endDate for a single-day plan. A day plan groups the day's focused activities rather than replacing them.",
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          name: str('Day plan name (for example, "Kyoto day trip").'),
          notes: str(
            'Optional overview, pacing, or transport notes for the day.',
          ),
          startDate: str('First day covered by this plan (YYYY-MM-DD).'),
          endDate: str(
            'Last day covered by this plan (YYYY-MM-DD); use the same date for one day.',
          ),
          timeZone: str('IANA time zone; defaults to the trip time zone.'),
        },
        required: ['name', 'startDate', 'endDate'],
      },
      async execute(input) {
        assertWritable('creating a macroplan');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const trip = useBoundStore.getState().trip[tripId];
        const timeZone = asOptStr(input.timeZone, 'timeZone') ?? trip.timeZone;
        const start = asStr(input.startDate, 'startDate');
        const end = asStr(input.endDate, 'endDate');
        const result = await dbAddMacroplan(
          {
            name: asStr(input.name, 'name'),
            notes: asOptStr(input.notes, 'notes') ?? '',
            timestampStart: dayStart(start, timeZone),
            timestampEnd: dayStart(end, timeZone, 1),
            timeZoneStart: timeZone,
            timeZoneEnd: timeZone,
          },
          { tripId },
        );
        return { ok: true, id: result.id, dayPlanId: result.id };
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
        return { ok: true, dayPlan: m };
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
