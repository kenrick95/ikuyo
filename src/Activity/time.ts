import { toFormat } from '../common/dateTime/temporalFormatter';

export function formatTime(timestamp: number, timeZone: string): string {
  return toFormat(
    'HHmm',
    Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(
      timeZone,
    ),
  );
}
