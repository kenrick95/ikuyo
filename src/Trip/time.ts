import { DateTime } from 'luxon';

export function formatToDateInput(date: DateTime) {
  return date.toFormat(`yyyy-LL-dd`);
}
export function getDateTimeFromDateInput(
  dateInputStr: string,
  timeZone: string
): DateTime {
  return DateTime.fromFormat(dateInputStr, `yyyy-LL-dd`, {
    zone: timeZone,
  });
}
export function formatTimestampToReadableDate(timestamp: number) {
  return DateTime.fromMillis(timestamp).toFormat(`d LLLL yyyy`);
}
