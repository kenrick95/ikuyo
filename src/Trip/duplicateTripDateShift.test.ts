import { describe, expect, it } from 'vitest';
import { shiftTimestampToTripDate } from './duplicateTripDateShift';

const TZ = 'America/New_York';

function ms(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): number {
  return Temporal.ZonedDateTime.from({
    timeZone: TZ,
    year,
    month,
    day,
    hour,
    minute,
  }).toInstant().epochMilliseconds;
}

function localDateTime(epochMs: number) {
  return Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(TZ);
}

describe('shiftTimestampToTripDate', () => {
  it('returns null/undefined unchanged', () => {
    expect(
      shiftTimestampToTripDate(null, ms(2026, 3, 1), ms(2026, 3, 2), TZ),
    ).toBeNull();
    expect(
      shiftTimestampToTripDate(undefined, ms(2026, 3, 1), ms(2026, 3, 2), TZ),
    ).toBeUndefined();
  });

  it('keeps timestamps unchanged when the start date is unchanged', () => {
    const item = ms(2026, 3, 5, 10, 30);
    expect(
      shiftTimestampToTripDate(item, ms(2026, 3, 1), ms(2026, 3, 1), TZ),
    ).toBe(item);
  });

  it('shifts forward by +1 calendar day, preserving local time', () => {
    const result = shiftTimestampToTripDate(
      ms(2026, 3, 3, 10, 30),
      ms(2026, 3, 1),
      ms(2026, 3, 2),
      TZ,
    );
    const d = localDateTime(result);
    expect([d.year, d.month, d.day, d.hour, d.minute]).toEqual([
      2026, 3, 4, 10, 30,
    ]);
  });

  it('shifts backward by -1 calendar day, preserving local time', () => {
    const result = shiftTimestampToTripDate(
      ms(2026, 3, 3, 10, 30),
      ms(2026, 3, 1),
      ms(2026, 2, 28),
      TZ,
    );
    const d = localDateTime(result);
    expect([d.year, d.month, d.day, d.hour, d.minute]).toEqual([
      2026, 3, 2, 10, 30,
    ]);
  });

  it('preserves local time across the spring-forward DST transition', () => {
    // DST begins 2026-03-08 02:00 in New York (EST -> EDT).
    const sourceStart = ms(2026, 3, 1);
    const newStart = ms(2026, 3, 8);
    const item = ms(2026, 3, 6, 10, 0); // 10:00 EST

    const result = shiftTimestampToTripDate(item, sourceStart, newStart, TZ);

    const d = localDateTime(result);
    expect([d.year, d.month, d.day, d.hour, d.minute]).toEqual([
      2026, 3, 13, 10, 0,
    ]);

    // Naive millisecond addition would drift to 11:00 due to the DST gap.
    const naive = item + (newStart - sourceStart);
    expect(result).not.toBe(naive);
  });

  it('preserves local time across the fall-back DST transition', () => {
    // DST ends 2026-11-01 02:00 in New York (EDT -> EST).
    const sourceStart = ms(2026, 10, 25);
    const newStart = ms(2026, 11, 1);
    const item = ms(2026, 10, 28, 10, 0); // 10:00 EDT

    const result = shiftTimestampToTripDate(item, sourceStart, newStart, TZ);

    const d = localDateTime(result);
    expect([d.year, d.month, d.day, d.hour, d.minute]).toEqual([
      2026, 11, 4, 10, 0,
    ]);

    // Naive millisecond addition would drift to 09:00 because of the DST gap.
    const naive = item + (newStart - sourceStart);
    expect(result).not.toBe(naive);
  });

  it('maps an item on the start date to the new start date', () => {
    const sourceStart = ms(2026, 3, 1);
    const newStart = ms(2026, 3, 8);
    expect(
      shiftTimestampToTripDate(sourceStart, sourceStart, newStart, TZ),
    ).toBe(newStart);
  });
});
