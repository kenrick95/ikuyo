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
      name: 'macroplan-create',
      description:
        'Creates a macroplan (rough multi-day plan block) in a trip. Provide name, startDate and endDate (YYYY-MM-DD; endDate is the last day).',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          name: str('Macroplan name.'),
          notes: str('Optional notes.'),
          startDate: str('First day (YYYY-MM-DD).'),
          endDate: str('Last day (YYYY-MM-DD).'),
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
        return { ok: true, id: result.id, macroplanId: result.id };
      },
    },
    {
      name: 'macroplan-get',
      description: 'Returns a macroplan from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: {
          macroplanId: str('The macroplan id.'),
        },
        required: ['macroplanId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.macroplanId, 'macroplanId');
        const m = useBoundStore.getState().macroplan[id];
        if (!m) throw new Error(`Macroplan ${id} is not loaded.`);
        return { ok: true, macroplan: m };
      },
    },
    {
      name: 'macroplan-update',
      description:
        'Updates an existing macroplan (name, notes, dates). Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          macroplanId: str('The macroplan id.'),
          name: str('New name.'),
          notes: str('New notes.'),
          startDate: str('New first day (YYYY-MM-DD).'),
          endDate: str('New last day (YYYY-MM-DD).'),
          timeZone: str('New IANA time zone.'),
        },
        required: ['macroplanId'],
      },
      async execute(input) {
        assertWritable('updating a macroplan');
        requireAuthUser();
        const id = asStr(input.macroplanId, 'macroplanId');
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
        return { ok: true, macroplanId: id };
      },
    },
  ];
}
