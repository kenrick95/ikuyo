import { deleteMutation, postMutation, putMutation } from '../data/apiClient';
import { id } from '../data/id';
import {
  optimisticMacroplanPatch,
  optimisticMacroplanRemove,
  optimisticMacroplanUpsert,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbTrip, DbTripWithMacroplan } from '../Trip/db';
import type { TripSliceMacroplan } from '../Trip/store/types';

export type DbMacroplanWithTrip = Omit<DbMacroplan, 'trip'> & {
  trip: DbTripWithMacroplan;
};

/**
 * Macroplan is a rough plan for the trip,
 * that can span across days, or only for a single day
 * Allow overlaps too.
 * Displays as additional row like accomodation in timetable.
 *
 * Use case:
 * - in a long trip, I want to plan the trips with several different major locations; so using Macroplan will help break down the whole trip into smaller parts
 *
 * Convention: The "p" in "Macroplan" is not capitalized
 */
export type DbMacroplan = {
  id: string;
  name: string;
  notes: string;

  /** ms */
  timestampStart: number;
  /** ms of day _after_ of macroplan end. This means the final full day of macroplan is one day before `timestampEnd` */
  timestampEnd: number;

  /** default: trip.timeZone */
  timeZoneStart: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneEnd: string | null | undefined;

  /** ms */
  createdAt: number;

  /** ms */
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
};

export async function dbAddMacroplan(
  newMacroplan: Omit<
    DbMacroplan,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'
  >,
  { tripId }: { tripId: string },
) {
  const newId = id();
  return optimisticRun(
    ['macroplan', 'trip'],
    () => {
      const now = Date.now();
      optimisticMacroplanUpsert(tripId, {
        ...newMacroplan,
        id: newId,
        createdAt: now,
        lastUpdatedAt: now,
        tripId,
        commentGroupId: undefined,
      } as TripSliceMacroplan);
    },
    async () => {
      const result = await postMutation<{ id: string }>(
        `/api/trips/${encodeURIComponent(tripId)}/macroplans`,
        { ...newMacroplan, id: newId },
      );
      return {
        id: result.id,
        transaction: result,
        undo: async () =>
          deleteMutation(`/api/macroplans/${encodeURIComponent(result.id)}`),
      };
    },
  );
}

export async function dbUpdateMacroplan(
  macroplan: Omit<DbMacroplan, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return optimisticRun(
    ['macroplan'],
    () => optimisticMacroplanPatch(macroplan.id, macroplan),
    async () => {
      const result = await putMutation<DbMacroplan>(
        `/api/macroplans/${encodeURIComponent(macroplan.id)}`,
        macroplan,
      );
      return { transaction: result, undo: async () => undefined };
    },
  );
}

export async function dbDeleteMacroplan(macroplanId: string) {
  const state = useBoundStore.getState();
  const tripId = state.macroplan[macroplanId]?.tripId;
  return optimisticRun(
    ['macroplan', 'trip'],
    () => {
      if (tripId) optimisticMacroplanRemove(tripId, macroplanId);
    },
    () => deleteMutation(`/api/macroplans/${encodeURIComponent(macroplanId)}`),
  );
}
