import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatTime(timestamp: number, timeZone: string): string {
  return toFormat(
    'HHmm',
    Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(
      timeZone,
    ),
  );
}

export function formatAccommodationTimeRange({
  timestampCheckIn,
  timestampCheckOut,
  timeZoneCheckIn,
  timeZoneCheckOut,
}: {
  timestampCheckIn: number | undefined;
  timestampCheckOut: number | undefined;
  timeZoneCheckIn: string;
  timeZoneCheckOut: string;
}): string | null {
  const checkInZonedDateTime = timestampCheckIn
    ? Temporal.Instant.fromEpochMilliseconds(
        timestampCheckIn,
      ).toZonedDateTimeISO(timeZoneCheckIn)
    : undefined;
  const checkOutZonedDateTime = timestampCheckOut
    ? Temporal.Instant.fromEpochMilliseconds(
        timestampCheckOut,
      ).toZonedDateTimeISO(timeZoneCheckOut)
    : undefined;

  if (checkInZonedDateTime && checkOutZonedDateTime) {
    if (timeZoneCheckIn === timeZoneCheckOut) {
      if (
        checkInZonedDateTime
          .toPlainDate()
          .equals(checkOutZonedDateTime.toPlainDate())
      ) {
        // e.g. "1 January 2025 15:00-22:00"
        return `${toFormat('d LLLL yyyy HH:mm', checkInZonedDateTime)}–${toFormat('HH:mm', checkOutZonedDateTime)} (${timeZoneCheckIn})`;
      }
      // e.g. "1 December 2025 15:00-15 February 2026 11:00"
      return `${toFormat('d LLLL yyyy HH:mm', checkInZonedDateTime)}–${toFormat('d LLLL yyyy HH:mm', checkOutZonedDateTime)} (${timeZoneCheckIn})`;
    } else {
      // e.g. "1 January 2025 15:00 (Asia/Tokyo)-31 January 2025 11:00 (America/New_York)"
      return `${toFormat('d LLLL yyyy HH:mm', checkInZonedDateTime)} (${timeZoneCheckIn})–${toFormat('d LLLL yyyy HH:mm', checkOutZonedDateTime)} (${timeZoneCheckOut})`;
    }
  } else if (checkInZonedDateTime) {
    // e.g. "1 January 2025 15:00-Check out time not set"
    return `${toFormat('d LLLL yyyy HH:mm', checkInZonedDateTime)}–Check out time not set`;
  } else if (checkOutZonedDateTime) {
    // e.g. "Check in time not set-1 January 2025 15:00"
    return `Check in time not set–${toFormat('d LLLL yyyy HH:mm', checkOutZonedDateTime)}`;
  }
  return null;
}
