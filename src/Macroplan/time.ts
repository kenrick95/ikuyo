import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatMacroplanDateRange({
  timestampStart,
  timestampEnd,
  timeZoneStart,
  timeZoneEnd,
}: {
  timestampStart: number | undefined;
  timestampEnd: number | undefined;
  timeZoneStart: string;
  timeZoneEnd: string;
}): string | null {
  const macroplanStartZonedDateTime = timestampStart
    ? Temporal.Instant.fromEpochMilliseconds(timestampStart).toZonedDateTimeISO(
        timeZoneStart,
      )
    : undefined;
  const macroplanFinalDayZonedDateTime = timestampEnd
    ? Temporal.Instant.fromEpochMilliseconds(timestampEnd)
        .toZonedDateTimeISO(timeZoneEnd)
        .subtract({ minutes: 1 })
    : undefined;
  const macroplanFirstDay = macroplanStartZonedDateTime?.toPlainDate();
  const macroplanFinalDay = macroplanFinalDayZonedDateTime?.toPlainDate();

  if (macroplanFirstDay && macroplanFinalDay) {
    if (timeZoneStart === timeZoneEnd) {
      const timeZone = timeZoneStart ?? 'local time';
      if (macroplanFirstDay.equals(macroplanFinalDay)) {
        // e.g. "1 January 2025"
        return `${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZone})`;
      } else if (
        macroplanFirstDay.month === macroplanFinalDay.month &&
        macroplanFirstDay.year === macroplanFinalDay.year
      ) {
        // e.g. "1-10 January 2025"
        return `${toFormat('d', macroplanFirstDay)}–${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZone})`;
      } else if (macroplanFirstDay.year === macroplanFinalDay.year) {
        // e.g. "1 January-10 May 2025"
        return `${toFormat('d LLLL', macroplanFirstDay)}–${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZone})`;
      }
      // e.g. "1 December 2025-15 February 2026"
      return `${toFormat('d LLLL yyyy', macroplanFirstDay)}–${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZone})`;
    } else {
      // e.g. "1 January 2025 (Asia/Tokyo)-31 January 2025 (America/New_York)"
      return `${toFormat('d LLLL yyyy', macroplanFirstDay)} (${timeZoneStart})–${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZoneEnd})`;
    }
  } else if (macroplanFirstDay) {
    // e.g. "1 January 2025-End date not set"
    return `${toFormat('d LLLL yyyy', macroplanFirstDay)}–End date not set (${timeZoneStart})`;
  } else if (macroplanFinalDay) {
    // e.g. "Start date not set-1 January 2025"
    return `Start date not set–${toFormat('d LLLL yyyy', macroplanFinalDay)} (${timeZoneEnd})`;
  }
  return null;
}
