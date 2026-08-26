import { describe, expect, test } from 'vitest';
import { epochToTripDate, resolveTripDates } from './tripDates';

describe('WebMCP trip dates', () => {
  test('round-trips stored bounds to inclusive dates for a partial update', () => {
    const original = resolveTripDates('2025-03-10', '2025-03-15', 'UTC');

    const updated = resolveTripDates(
      '2025-03-11',
      epochToTripDate(original.timestampEnd, 'UTC', true),
      'UTC',
    );

    expect(updated).toEqual({
      timestampStart: Date.parse('2025-03-11T00:00:00Z'),
      timestampEnd: original.timestampEnd,
    });
  });

  test('rejects a range whose start is after its end', () => {
    expect(() => resolveTripDates('2025-03-16', '2025-03-15', 'UTC')).toThrow(
      'startDate cannot be after endDate',
    );
  });
});
