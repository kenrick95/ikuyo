import { DateTime } from 'luxon';

export function pad4(num: number): string {
  if (num >= 1000) {
    return `${num}`;
  } else if (num >= 100) {
    return `0${num}`;
  } else if (num >= 10) {
    return `00${num}`;
  }
  return `000${num}`;
}
export function pad2(num: number): string {
  if (num >= 10) {
    return `${num}`;
  }
  return `0${num}`;
}
/**
 *
 * @returns `YYYY-MM-DD`
 */
export function formatFullDate(date: Date) {
  return `${pad4(date.getFullYear())}-${pad2(date.getMonth())}-${pad2(
    date.getDate()
  )}`;
}
/**
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local
 * @param date Date object in trip's time zone
 * @returns `YYYY-MM-DDTHH:mm`
 */
export function formatToDatetimeLocalInput(date: DateTime) {
  return date.toFormat(`yyyy-LL-dd'T'HH:mm`);
}
export function getDateTimeFromDatetimeLocalInput(
  datetimeLocalInputString: string,
  timeZone: string
): DateTime {
  return DateTime.fromFormat(
    datetimeLocalInputString,
    `yyyy-LL-dd'T'HH:mm`,
    {
      zone: timeZone, 
    }
  );
}
export function formatTime(timestamp: number, timeZone: string): string {
  return DateTime.fromMillis(timestamp).setZone(timeZone).toFormat(`HHmm`);
}
