import type { TripSliceActivity } from '../Trip/store/types';

/**
 * Converts a grid row value (time string like "0900") to a time offset in milliseconds
 */
export function gridRowToTimeOffset(gridRow: string): number {
  if (gridRow.startsWith('t')) {
    gridRow = gridRow.substring(1);
  }

  // Handle both formats: "0900" and "te0900" (end time)
  if (gridRow.startsWith('te')) {
    gridRow = gridRow.substring(2);
  }

  const hours = parseInt(gridRow.substring(0, 2), 10);
  const minutes = parseInt(gridRow.substring(2), 10);
  return (hours * 60 + minutes) * 60 * 1000;
}

/**
 * Converts a grid column value (day-column format like "d1-c0") to a day index
 */
export function gridColumnToDay(gridColumn: string): number {
  if (gridColumn.startsWith('d')) {
    // Format: d1-c0
    const dayPart = gridColumn.split('-')[0];
    return parseInt(dayPart.substring(1), 10);
  }
  return 1; // Default to first day if parsing fails
}

/**
 * Calculate new timestamps based on the drag position
 *
 * Note: calculation is relative to trip time zone, results are in timestamp (so activity time zone not changed)
 */
export function calculateNewTimestamps(
  gridRow: string,
  gridColumn: string,
  activity: TripSliceActivity,
  tripTimestampStart: number,
  tripTimeZone: string,
  mode: 'drag' | 'resize',
): { timestampStart: number; timestampEnd: number; error?: string } {
  // Get the new day index
  const newDayIndex = gridColumnToDay(gridColumn) - 1; // 0-based index

  // Get time offset from grid row
  const timeOffset = gridRowToTimeOffset(gridRow);

  // Calculate the start of `the day for the activity's new position
  const tripStart =
    Temporal.Instant.fromEpochMilliseconds(
      tripTimestampStart,
    ).toZonedDateTimeISO(tripTimeZone);
  const newDayStart = tripStart.add({ days: newDayIndex }).startOfDay();
  const dropTargetStartTimestamp = newDayStart.add({
    milliseconds: timeOffset,
  }).epochMilliseconds;

  // Calculate the new duration of the activity: on dragging preserve the original duration, on resizing calculate the new duration based on the new end time
  /** -1 if either timestamp is not set! */
  let newDuration =
    activity.timestampStart != null && activity.timestampEnd != null
      ? mode === 'drag'
        ? activity.timestampEnd - activity.timestampStart
        : dropTargetStartTimestamp - activity.timestampStart + 30 * 60 * 1000 // Add 30 minutes to the new end time for resizing
      : -1;
  if (newDuration < 0 && mode === 'drag') {
    console.log(
      'Activity duration not set or invalid, using default duration of 30 minutes',
    );
    newDuration = 30 * 60 * 1000; // Default to 30 minutes if duration is not set
  } else if (newDuration < 0 && mode === 'resize') {
    return {
      error: 'Activity end time cannot end earlier than start time',
      timestampStart: activity.timestampStart ?? dropTargetStartTimestamp,
      timestampEnd:
        activity.timestampEnd ?? dropTargetStartTimestamp + 30 * 60 * 1000,
    };
  }

  // Add the time offset to get the new start timestamp (resize: keep same start; drag: move to new start)
  const newStartTimestamp =
    mode === 'drag'
      ? dropTargetStartTimestamp
      : (activity.timestampStart ?? dropTargetStartTimestamp);

  // The end timestamp is the start timestamp plus the original duration
  const newEndTimestamp = newStartTimestamp + newDuration;

  console.log('New timestamps calculated', {
    day: newDayIndex + 1,
    timeOffset: `${timeOffset / (60 * 60 * 1000)} hours`,
    originalDuration: `${newDuration / (60 * 60 * 1000)} hours`,
    newStartTimestamp:
      Temporal.Instant.fromEpochMilliseconds(
        newStartTimestamp,
      ).toZonedDateTimeISO(tripTimeZone),
    newEndTimestamp:
      Temporal.Instant.fromEpochMilliseconds(
        newEndTimestamp,
      ).toZonedDateTimeISO(tripTimeZone),
  });

  return {
    timestampStart: newStartTimestamp,
    timestampEnd: newEndTimestamp,
  };
}
