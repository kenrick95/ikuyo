import { DateTime } from 'luxon';

export function formatToDateInput(date: DateTime) {
  return date.toFormat(`yyyy-LL-dd`);
}
export function getDateTimeFromDateInput(dateInputStr: string): DateTime {
  return DateTime.fromFormat(dateInputStr, `yyyy-LL-dd`);
}
