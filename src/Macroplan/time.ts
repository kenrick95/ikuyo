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
  timeZoneStart,
  timeZoneEnd,
}: {
  timestampStart: number | undefined;
  timestampEnd: number | undefined;
  timeZoneStart: string | undefined;
  timeZoneEnd: string | undefined;
}): string | null {
  const dtStart = timestampStart
    ? DateTime.fromMillis(timestampStart, {
        zone: timeZoneStart,
      })
    : undefined;
  const dtEnd = timestampEnd
    ? DateTime.fromMillis(timestampEnd, {
        zone: timeZoneEnd,
      }).minus({ minute: 1 })
    : undefined;

  if (dtStart && dtEnd) {
    if (timeZoneStart === timeZoneEnd) {
      const timeZone = timeZoneStart ?? 'local time';
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
      return `${dtStart.toFormat('d LLLL yyyy')}–${dtEnd.toFormat('d LLLL yyyy')} (${timeZone})`;
    } else {
      // e.g. "1 January 2025 (Asia/Tokyo)-31 January 2025 (America/New_York)"
      return `${dtStart.toFormat('d LLLL yyyy')} (${timeZoneStart})–${dtEnd.toFormat('d LLLL yyyy')} (${timeZoneEnd})`;
    }
  } else if (dtStart) {
    // e.g. "1 January 2025-End date not set"
    return `${dtStart.toFormat('d LLLL yyyy')}–End date not set (${timeZoneStart})`;
  } else if (dtEnd) {
    // e.g. "Start date not set-1 January 2025"
    return `Start date not set–${dtEnd.toFormat('d LLLL yyyy')} (${timeZoneEnd})`;
  }
  return null;
}
