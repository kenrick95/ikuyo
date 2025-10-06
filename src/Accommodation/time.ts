import { DateTime } from 'luxon';

export function formatToDatetimeLocalInput(date: DateTime) {
  return date.toFormat(`yyyy-LL-dd'T'HH:mm`);
}
export function getDateTimeFromDatetimeLocalInput(
  datetimeLocalInputString: string,
  timeZone: string,
): DateTime {
  return DateTime.fromFormat(datetimeLocalInputString, `yyyy-LL-dd'T'HH:mm`, {
    zone: timeZone,
  });
}

export function formatTime(timestamp: number, timeZone: string): string {
  return DateTime.fromMillis(timestamp).setZone(timeZone).toFormat('HHmm');
}

export function formatAccommodationTimeRange({
  timestampCheckIn,
  timestampCheckOut,
  timeZoneCheckIn,
  timeZoneCheckOut,
}: {
  timestampCheckIn: number | undefined;
  timestampCheckOut: number | undefined;
  timeZoneCheckIn: string | undefined;
  timeZoneCheckOut: string | undefined;
}): string | null {
  const dtStart = timestampCheckIn
    ? DateTime.fromMillis(timestampCheckIn, {
        zone: timeZoneCheckIn,
      })
    : undefined;
  const dtEnd = timestampCheckOut
    ? DateTime.fromMillis(timestampCheckOut, {
        zone: timeZoneCheckOut,
      })
    : undefined;

  if (dtStart && dtEnd) {
    if (timeZoneCheckIn === timeZoneCheckOut) {
      if (dtStart.hasSame(dtEnd, 'day')) {
        // e.g. "1 January 2025 15:00-22:00"
        return `${dtStart.toFormat('d LLLL yyyy HH:mm')}–${dtEnd.toFormat('HH:mm')} (${timeZoneCheckIn})`;
      }
      // e.g. "1 December 2025 15:00-15 February 2026 11:00"
      return `${dtStart.toFormat('d LLLL yyyy HH:mm')}–${dtEnd.toFormat('d LLLL yyyy HH:mm')} (${timeZoneCheckIn})`;
    } else {
      // e.g. "1 January 2025 15:00 (Asia/Tokyo)-31 January 2025 11:00 (America/New_York)"
      return `${dtStart.toFormat('d LLLL yyyy HH:mm')} (${timeZoneCheckIn})–${dtEnd.toFormat('d LLLL yyyy HH:mm')} (${timeZoneCheckOut})`;
    }
  } else if (dtStart) {
    // e.g. "1 January 2025 15:00-Check out time not set"
    return `${dtStart.toFormat('d LLLL yyyy HH:mm')}–Check out time not set`;
  } else if (dtEnd) {
    // e.g. "Check in time not set-1 January 2025 15:00"
    return `Check in time not set–${dtEnd.toFormat('d LLLL yyyy HH:mm')}`;
  }
  return null;
}
