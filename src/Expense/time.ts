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
export function formatTimestampToReadableDate(dateTime: DateTime) {
  return dateTime.toFormat(`d LLLL yyyy`);
}
