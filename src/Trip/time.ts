import { DateTime } from 'luxon';

export function formatToDateInput(date: DateTime) {
  return date.toFormat('yyyy-LL-dd');
}
export function getDateTimeFromDateInput(
  dateInputStr: string,
  timeZone: string,
): DateTime {
  return DateTime.fromFormat(dateInputStr, 'yyyy-LL-dd', {
    zone: timeZone,
  });
}
export function formatTripDateRange(trip: {
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
}): string {
  const dtStart = DateTime.fromMillis(trip.timestampStart, {
    zone: trip.timeZone,
  });
  const dtEnd = DateTime.fromMillis(trip.timestampEnd, {
    zone: trip.timeZone,
  }).minus({
    day: 1,
  });

  const tripEndString = dtEnd.toFormat('d LLLL yyyy');
  if (dtStart.hasSame(dtEnd, 'day')) {
    // implies same month & year
    // e.g. "1 January 2025"
    return tripEndString;
  } else if (dtStart.hasSame(dtEnd, 'month')) {
    // implies same year
    // e.g. "1-15 January 2025"
    return `${dtStart.toFormat('d')}–${tripEndString}`;
  } else if (dtStart.hasSame(dtEnd, 'year')) {
    // e.g. "1 January-15 February 2025"
    return `${dtStart.toFormat('d LLLL')}–${tripEndString}`;
  }
  // e.g. "1 December 2025-15 February 2026"
  return `${dtStart.toFormat('d LLLL yyyy')}–${tripEndString}`;
}
