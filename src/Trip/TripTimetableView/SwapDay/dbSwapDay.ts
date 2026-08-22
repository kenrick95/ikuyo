import { postMutation } from '../../../data/apiClient';
import { backendActivityWrites } from '../../../data/backendConfig';
import { db } from '../../../data/db';
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

  if (backendActivityWrites) {
    await postMutation(
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
        await postMutation(
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
  }

  await db.transact(
    updates.map((update) => {
      return db.tx.activity[update.id].merge({
        timestampStart: update.timestampStart,
        timestampEnd: update.timestampEnd,
        lastUpdatedAt: Date.now(),
      });
    }),
  );

  return {
    movedCount: updates.length,
    undo: async () => {
      await db.transact(
        updates.map((update) => {
          const original = originalById.get(update.id);
          return db.tx.activity[update.id].merge({
            timestampStart: original?.timestampStart,
            timestampEnd: original?.timestampEnd,
            lastUpdatedAt: Date.now(),
          });
        }),
      );
    },
  };
}
