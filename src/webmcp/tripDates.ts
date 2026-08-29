/** Midnight (00:00) of a YYYY-MM-DD date in a time zone, as epoch ms. */
function dayStartEpochMs(
  isoDate: string,
  timeZone: string,
  addDays = 0,
): number {
  const plain = Temporal.PlainDate.from(isoDate).add({ days: addDays });
  return plain.toZonedDateTime({
    timeZone,
    plainTime: Temporal.PlainTime.from('00:00'),
  }).epochMilliseconds;
}

/**
 * Convert inclusive YYYY-MM-DD trip dates to Ikuyo's stored bounds: start-day
 * midnight and midnight after the final day.
 */
export function resolveTripDates(
  start: unknown,
  end: unknown,
  timeZone: string,
): { timestampStart: number; timestampEnd: number } {
  if (typeof start !== 'string' || typeof end !== 'string') {
    throw new Error(
      'startDate and endDate must be ISO-8601 date strings (YYYY-MM-DD)',
    );
  }
  const startDate = Temporal.PlainDate.from(start);
  const endDate = Temporal.PlainDate.from(end);
  if (Temporal.PlainDate.compare(startDate, endDate) > 0) {
    throw new Error('startDate cannot be after endDate');
  }
  return {
    timestampStart: dayStartEpochMs(startDate.toString(), timeZone),
    timestampEnd: dayStartEpochMs(endDate.toString(), timeZone, 1),
  };
}

/** Convert a stored trip bound back to the tool's inclusive YYYY-MM-DD format. */
export function epochToTripDate(
  timestamp: number,
  timeZone: string,
  endExclusive = false,
): string {
  let zoned =
    Temporal.Instant.fromEpochMilliseconds(timestamp).toZonedDateTimeISO(
      timeZone,
    );
  if (endExclusive) zoned = zoned.subtract({ days: 1 });
  return zoned.toPlainDate().toString();
}
