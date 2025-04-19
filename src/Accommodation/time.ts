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
