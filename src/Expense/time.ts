import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatTimestampToReadableDate(
  dateTime: Temporal.ZonedDateTime,
): string {
  return toFormat('d LLLL yyyy', dateTime);
}
