import { DateTime } from 'luxon';
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

  const hours = parseInt(gridRow.substring(0, 2));
  const minutes = parseInt(gridRow.substring(2));
  return (hours * 60 + minutes) * 60 * 1000;
}

/**
 * Converts a grid column value (day-column format like "d1-c0") to a day index
 */
export function gridColumnToDay(gridColumn: string): number {
  if (gridColumn.startsWith('d')) {
    // Format: d1-c0
    const dayPart = gridColumn.split('-')[0];
    return parseInt(dayPart.substring(1));
  }
  return 1; // Default to first day if parsing fails
}

/**
 * Calculate new timestamps based on the drag position
 */
export function calculateNewTimestamps(
  gridRow: string,
  gridColumn: string,
  activity: TripSliceActivity,
  tripTimestampStart: number,
  tripTimeZone: string,
): { timestampStart: number; timestampEnd: number } {
  console.log('Calculating new timestamps', { gridRow, gridColumn });

  // Get the new day index
  const newDayIndex = gridColumnToDay(gridColumn) - 1; // 0-based index

  // Get time offset from grid row
  const timeOffset = gridRowToTimeOffset(gridRow);

  // Calculate the original duration of the activity
  const originalDuration = activity.timestampEnd - activity.timestampStart;

  // Calculate the start of the day for the activity's new position
  const tripStart =
    DateTime.fromMillis(tripTimestampStart).setZone(tripTimeZone);
  const newDayStart = tripStart.plus({ days: newDayIndex }).startOf('day');

  // Add the time offset to get the new start timestamp
  const newStartTimestamp = newDayStart
    .plus({ milliseconds: timeOffset })
    .toMillis();

  // The end timestamp is the start timestamp plus the original duration
  const newEndTimestamp = newStartTimestamp + originalDuration;

  console.log('New timestamps calculated', {
    day: newDayIndex + 1,
    timeOffset: `${timeOffset / (60 * 60 * 1000)} hours`,
    originalDuration: `${originalDuration / (60 * 60 * 1000)} hours`,
    newStartTimestamp: DateTime.fromMillis(newStartTimestamp)
      .setZone(tripTimeZone)
      .toISO(),
    newEndTimestamp: DateTime.fromMillis(newEndTimestamp)
      .setZone(tripTimeZone)
      .toISO(),
  });

  return {
    timestampStart: newStartTimestamp,
    timestampEnd: newEndTimestamp,
  };
}
