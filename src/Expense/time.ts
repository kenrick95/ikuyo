import type { DateTime } from 'luxon';

export function formatTimestampToReadableDate(dateTime: DateTime) {
  return dateTime.toFormat('d LLLL yyyy');
}
