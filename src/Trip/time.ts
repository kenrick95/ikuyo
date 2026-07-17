import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatTripDateRange(trip: {
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
}): string {
  const tripStartZonedDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  ).toZonedDateTimeISO(trip.timeZone);
  const tripFinalDayZonedDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampEnd,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .subtract({ days: 1 });

  const tripEndString = toFormat('d LLLL yyyy', tripFinalDayZonedDateTime);
  if (
    tripStartZonedDateTime.since(tripFinalDayZonedDateTime, {
      largestUnit: 'days',
    }).days === 0
  ) {
    // implies same month & year
    // e.g. "1 January 2025"
    return tripEndString;
  } else if (
    tripStartZonedDateTime.since(tripFinalDayZonedDateTime, {
      largestUnit: 'months',
    }).months === 0
  ) {
    // implies same year
    // e.g. "1-15 January 2025"
    return `${toFormat('d', tripStartZonedDateTime)}–${tripEndString}`;
  } else if (
    tripStartZonedDateTime.since(tripFinalDayZonedDateTime, {
      largestUnit: 'years',
    }).years === 0
  ) {
    // e.g. "1 January-15 February 2025"
    return `${toFormat('d LLLL', tripStartZonedDateTime)}–${tripEndString}`;
  }
  // e.g. "1 December 2025-15 February 2026"
  return `${toFormat('d LLLL yyyy', tripStartZonedDateTime)}–${tripEndString}`;
}
