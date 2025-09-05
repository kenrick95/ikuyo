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

export function formatMacroplanDateRange({
  timestampStart,
  timestampEnd,
  timeZone,
}: {
  timestampStart: number | undefined;
  timestampEnd: number | undefined;
  timeZone: string | undefined;
}): string | null {
  const dtStart = timestampStart
    ? DateTime.fromMillis(timestampStart, {
        zone: timeZone,
      })
    : undefined;
  const dtEnd = timestampEnd
    ? DateTime.fromMillis(timestampEnd, {
        zone: timeZone,
      }).minus({ minute: 1 })
    : undefined;

  if (dtStart && dtEnd) {
    if (dtStart.hasSame(dtEnd, 'day')) {
      // e.g. "1 January 2025"
      return `${dtEnd.toFormat('d LLLL yyyy')} (${timeZone})`;
    } else if (dtStart.hasSame(dtEnd, 'month')) {
      // e.g. "1-10 January 2025"
      return `${dtStart.toFormat('d')}–${dtEnd.toFormat('d LLLL yyyy')} (${timeZone})`;
    } else if (dtStart.hasSame(dtEnd, 'year')) {
      // e.g. "1 January-10 May 2025"
      return `${dtStart.toFormat('d LLLL')}–${dtEnd.toFormat('d LLLL yyyy')} (${timeZone})`;
    }
    // e.g. "1 December 2025-15 February 2026"
    return `${dtStart.toFormat('d LLLL yyyy')}–${dtStart.toFormat('d LLLL yyyy')} (${timeZone})`;
  } else if (dtStart) {
    // e.g. "1 January 2025-End date not set"
    return `${dtStart.toFormat('d LLLL yyyy')} (${timeZone}) –End date not set`;
  } else if (dtEnd) {
    // e.g. "Start date not set-1 January 2025"
    return `Start date not set–${dtEnd.toFormat('d LLLL yyyy')} (${timeZone})`;
  }
  return null;
}
