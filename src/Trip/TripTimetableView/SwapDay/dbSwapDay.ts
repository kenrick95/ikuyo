import { patchMutation } from '../../../data/apiClient';
import {
  optimisticActivityPatch,
  optimisticRun,
} from '../../../data/optimistic';
import type { TripSliceActivity } from '../../store/types';
import { computeSwapDayActivityUpdates } from './swapDay';

/**
 * Swap all activities between two days.
 *
 * `sourceDayStartMs` and `targetDayStartMs` are the epoch milliseconds of the
 * start of each day (in the trip's time zone). Returns an `undo` function that
 * restores the original timestamps so callers can offer an "Undo" action.
 */
export async function dbSwapDayActivities({
  activities,
  sourceDayStartMs,
  targetDayStartMs,
  timeZone,
}: {
  activities: TripSliceActivity[];
  sourceDayStartMs: number;
  targetDayStartMs: number;
  timeZone: string;
}): Promise<{
  movedCount: number;
  undo: () => Promise<void>;
}> {
  const updates = computeSwapDayActivityUpdates({
    activities,
    sourceDayStartMs,
    targetDayStartMs,
    timeZone,
  });

  if (updates.length === 0) {
    return {
      movedCount: 0,
      undo: async () => {},
    };
  }

  // Keep a snapshot of the original timestamps for undo.
  const originalById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );

  return optimisticRun(
    ['activity'],
    () => {
      for (const update of updates) {
        optimisticActivityPatch(update.id, {
          timestampStart: update.timestampStart,
          timestampEnd: update.timestampEnd,
        });
      }
    },
    async () => {
      await patchMutation(
        `/api/trips/${encodeURIComponent(activities[0]?.tripId ?? '')}/activities/batch`,
        {
          activities: updates.map((update) => ({
            id: update.id,
            timestampStart: update.timestampStart,
            timestampEnd: update.timestampEnd,
          })),
        },
      );
      return {
        movedCount: updates.length,
        undo: async () => {
          await patchMutation(
            `/api/trips/${encodeURIComponent(activities[0]?.tripId ?? '')}/activities/batch`,
            {
              activities: updates.map((update) => {
                const original = originalById.get(update.id);
                return {
                  id: update.id,
                  timestampStart: original?.timestampStart,
                  timestampEnd: original?.timestampEnd,
                };
              }),
            },
          );
        },
      };
    },
  );
}
