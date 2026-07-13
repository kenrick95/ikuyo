import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatTimestampToReadableDate(
  dateTime: Temporal.ZonedDateTime,
): string {
  // TODO: check if without time zone information this will be formatted correctly?
  return toFormat('d LLLL yyyy', dateTime.toPlainDateTime());
}
