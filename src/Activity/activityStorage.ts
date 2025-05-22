import type { TripSliceTrip } from '../Trip/store/types';

const lastNewActivityTimestampStorageKey = 'ikuyo:last-new-activity-timestamp';

export function getNewActivityTimestamp(trip: TripSliceTrip): number {
  try {
    const fromStorage = JSON.parse(
      globalThis.localStorage.getItem(lastNewActivityTimestampStorageKey) ??
        '{}',
    ) as { timestamp?: number; tripId?: string };
    const timestampFromStorage = fromStorage.timestamp;
    if (
      timestampFromStorage == null ||
      Number.isNaN(timestampFromStorage) ||
      !fromStorage.tripId ||
      fromStorage.tripId !== trip.id
    ) {
      return trip.timestampStart;
    }
    if (
      trip.timestampStart <= timestampFromStorage &&
      timestampFromStorage <= trip.timestampEnd
    ) {
      return timestampFromStorage;
    }
    return trip.timestampStart;
  } catch {
    return trip.timestampStart;
  }
}

/**
 * When adding a new activity, what should be the activity's "start time" be?
 * Default to use the last newly created activity's end time within the same trip
 */
export function setNewActivityTimestamp(value: {
  timestamp: number;
  tripId: string;
}) {
  try {
    globalThis.localStorage.setItem(
      lastNewActivityTimestampStorageKey,
      JSON.stringify(value),
    );
  } catch {
    // no-op
  }
}
