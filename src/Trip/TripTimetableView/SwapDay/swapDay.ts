import { shiftTimestampToTripDate } from '../../duplicateTripDateShift';
import type { TripSliceActivity } from '../../store/types';

/** A single activity's timestamps after a day swap (id + new values). */
export type SwapDayActivityUpdate = {
  id: string;
  timestampStart: number | null | undefined;
  timestampEnd: number | null | undefined;
};

function dayDateFromStartMs(
  startMs: number,
  timeZone: string,
): Temporal.PlainDate {
  return Temporal.Instant.fromEpochMilliseconds(startMs)
    .toZonedDateTimeISO(timeZone)
    .startOfDay()
    .toPlainDate();
}

/**
 * Compute the activity timestamp updates needed to swap two days.
 *
 * An activity is considered to "belong" to a day when its wall-clock start
 * date (in the trip's time zone) is that day. Activities scheduled on the
 * source day are shifted to the target day (and vice versa), preserving each
 * activity's wall-clock time and duration via calendar-day arithmetic so that
 * DST transitions don't drift the times.
 *
 * Only activities that actually move are returned.
 */
export function computeSwapDayActivityUpdates({
  activities,
  sourceDayStartMs,
  targetDayStartMs,
  timeZone,
}: {
  activities: TripSliceActivity[];
  sourceDayStartMs: number;
  targetDayStartMs: number;
  timeZone: string;
}): SwapDayActivityUpdate[] {
  const sourceDate = dayDateFromStartMs(sourceDayStartMs, timeZone);
  const targetDate = dayDateFromStartMs(targetDayStartMs, timeZone);

  const updates: SwapDayActivityUpdate[] = [];

  for (const activity of activities) {
    const startMs = activity.timestampStart;
    if (startMs == null) {
      continue;
    }

    const activityDate = Temporal.Instant.fromEpochMilliseconds(startMs)
      .toZonedDateTimeISO(timeZone)
      .toPlainDate();

    let newStartMs: number | null | undefined;
    let newEndMs: number | null | undefined;

    if (activityDate.equals(sourceDate)) {
      newStartMs = shiftTimestampToTripDate(
        startMs,
        sourceDayStartMs,
        targetDayStartMs,
        timeZone,
      );
      newEndMs =
        activity.timestampEnd != null
          ? shiftTimestampToTripDate(
              activity.timestampEnd,
              sourceDayStartMs,
              targetDayStartMs,
              timeZone,
            )
          : activity.timestampEnd;
    } else if (activityDate.equals(targetDate)) {
      newStartMs = shiftTimestampToTripDate(
        startMs,
        targetDayStartMs,
        sourceDayStartMs,
        timeZone,
      );
      newEndMs =
        activity.timestampEnd != null
          ? shiftTimestampToTripDate(
              activity.timestampEnd,
              targetDayStartMs,
              sourceDayStartMs,
              timeZone,
            )
          : activity.timestampEnd;
    } else {
      continue;
    }

    if (newStartMs !== startMs || newEndMs !== activity.timestampEnd) {
      updates.push({
        id: activity.id,
        timestampStart: newStartMs,
        timestampEnd: newEndMs,
      });
    }
  }

  return updates;
}
