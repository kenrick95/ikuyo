/**
 * Shift a timestamp to a new trip start date while preserving the item's
 * relative position within the trip (same number of calendar days from the
 * trip's start) and its local wall-clock time in `timeZone`.
 *
 * Calendar-day arithmetic is used (rather than raw millisecond addition) so
 * that timestamps survive DST transitions without drifting by an hour.
 */
export function shiftTimestampToTripDate(
  timestampMs: number,
  sourceTripStartMs: number,
  newTripStartMs: number,
  timeZone: string,
): number;
export function shiftTimestampToTripDate(
  timestampMs: null,
  sourceTripStartMs: number,
  newTripStartMs: number,
  timeZone: string,
): null;
export function shiftTimestampToTripDate(
  timestampMs: undefined,
  sourceTripStartMs: number,
  newTripStartMs: number,
  timeZone: string,
): undefined;
export function shiftTimestampToTripDate(
  timestampMs: number | null | undefined,
  sourceTripStartMs: number,
  newTripStartMs: number,
  timeZone: string,
): number | null | undefined;
export function shiftTimestampToTripDate(
  timestampMs: number | null | undefined,
  sourceTripStartMs: number,
  newTripStartMs: number,
  timeZone: string,
): number | null | undefined {
  if (timestampMs == null) {
    return timestampMs;
  }
  const sourceTripStartDate = Temporal.Instant.fromEpochMilliseconds(
    sourceTripStartMs,
  )
    .toZonedDateTimeISO(timeZone)
    .toPlainDate();
  const newTripStartDate = Temporal.Instant.fromEpochMilliseconds(
    newTripStartMs,
  )
    .toZonedDateTimeISO(timeZone)
    .toPlainDate();
  const itemZonedDateTime =
    Temporal.Instant.fromEpochMilliseconds(timestampMs).toZonedDateTimeISO(
      timeZone,
    );
  const daysFromStart = itemZonedDateTime
    .toPlainDate()
    .since(sourceTripStartDate, { largestUnit: 'days' }).days;
  const newItemDate = newTripStartDate.add({ days: daysFromStart });
  const newItemZonedDateTime = Temporal.ZonedDateTime.from(
    {
      timeZone,
      year: newItemDate.year,
      month: newItemDate.month,
      day: newItemDate.day,
      hour: itemZonedDateTime.hour,
      minute: itemZonedDateTime.minute,
      second: itemZonedDateTime.second,
      millisecond: itemZonedDateTime.millisecond,
    },
    { disambiguation: 'compatible' },
  );
  return newItemZonedDateTime.toInstant().epochMilliseconds;
}
