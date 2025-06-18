import { DateTime } from 'luxon';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getTripStatus } from './getTripStatus';

describe('getTripStatus', () => {
  const mockNow = DateTime.fromISO('2025-06-18T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow.toJSDate());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('edge cases', () => {
    test('returns null when tripStart is undefined', () => {
      const tripEnd = mockNow.plus({ days: 1 });
      expect(getTripStatus(undefined, tripEnd)).toBeNull();
    });

    test('returns null when tripEnd is undefined', () => {
      const tripStart = mockNow.plus({ days: 1 });
      expect(getTripStatus(tripStart, undefined)).toBeNull();
    });

    test('returns null when both are undefined', () => {
      expect(getTripStatus(undefined, undefined)).toBeNull();
    });
  });

  describe('upcoming trips', () => {
    test('trip starting in minutes shows minutes', () => {
      const tripStart = mockNow.plus({ minutes: 30 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 30 minutes',
        color: 'blue',
      });
    });

    test('trip starting very soon shows "Starting soon"', () => {
      const tripStart = mockNow.plus({ seconds: 30 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'Starting soon',
        color: 'blue',
      });
    });

    test('trip starting in hours and minutes shows both', () => {
      const tripStart = mockNow.plus({ hours: 5, minutes: 45 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 5 hours, 45 minutes',
        color: 'blue',
      });
    });

    test('trip starting in days and hours shows both', () => {
      const tripStart = mockNow.plus({ days: 3, hours: 8 });
      const tripEnd = tripStart.plus({ days: 5 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 3 days, 8 hours',
        color: 'blue',
      });
    });

    test('trip starting in weeks and days shows both', () => {
      const tripStart = mockNow.plus({ weeks: 2, days: 3 });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 weeks, 3 days',
        color: 'blue',
      });
    });

    test('trip starting in months and weeks shows both', () => {
      const tripStart = mockNow.plus({ months: 2, weeks: 1 });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 months, 1 week',
        color: 'blue',
      });
    });

    test('trip starting in years and months shows both', () => {
      const tripStart = mockNow.plus({ years: 1, months: 6 });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 1 year, 6 months',
        color: 'blue',
      });
    });

    test('trip starting in multiple years shows years and months', () => {
      const tripStart = mockNow.plus({ years: 2, months: 3 });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 years, 3 months',
        color: 'blue',
      });
    });

    test('handles singular units correctly', () => {
      const tripStart = mockNow.plus({
        years: 1,
        months: 1,
        weeks: 1,
        days: 1,
        hours: 1,
        minutes: 1,
      });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 1 year, 1 month',
        color: 'blue',
      });
    });
    test('shows three significant units with "and"', () => {
      const tripStart = mockNow.plus({ weeks: 3, days: 2, hours: 5 });
      const tripEnd = tripStart.plus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.text).toContain('and');
      expect(result?.text).toMatch(/3 weeks, 2 days and \d+ hours/);
    });
  });

  describe('current trips', () => {
    test('trip happening now shows "Trip in progress"', () => {
      const tripStart = mockNow.minus({ days: 1 });
      const tripEnd = mockNow.plus({ days: 2 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });

    test('trip starting today shows "Trip in progress"', () => {
      const tripStart = mockNow.startOf('day');
      const tripEnd = mockNow.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });

    test('trip ending today shows "Trip in progress"', () => {
      const tripStart = mockNow.minus({ days: 2 });
      const tripEnd = mockNow.startOf('day').plus({ days: 1 }); // End of today

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });
  });

  describe('past trips', () => {
    test('trip ended minutes ago shows minutes', () => {
      const tripEnd = mockNow.minus({ minutes: 45 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '45 minutes ago',
        color: 'gray',
      });
    });

    test('trip ended very recently shows "Just ended"', () => {
      const tripEnd = mockNow.minus({ seconds: 30 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: 'Just ended',
        color: 'gray',
      });
    });

    test('trip ended hours and minutes ago shows both', () => {
      const tripEnd = mockNow.minus({ hours: 3, minutes: 20 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '3 hours, 20 minutes ago',
        color: 'gray',
      });
    });

    test('trip ended days and hours ago shows both', () => {
      const tripEnd = mockNow.minus({ days: 2, hours: 6 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '2 days, 6 hours ago',
        color: 'gray',
      });
    });

    test('trip ended weeks and days ago shows both', () => {
      const tripEnd = mockNow.minus({ weeks: 1, days: 4 });
      const tripStart = tripEnd.minus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '1 week, 4 days ago',
        color: 'gray',
      });
    });

    test('trip ended months and weeks ago shows both', () => {
      const tripEnd = mockNow.minus({ months: 3, weeks: 2 });
      const tripStart = tripEnd.minus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '3 months, 2 weeks ago',
        color: 'gray',
      });
    });

    test('trip ended years and months ago shows both', () => {
      const tripEnd = mockNow.minus({ years: 2, months: 4 });
      const tripStart = tripEnd.minus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '2 years, 4 months ago',
        color: 'gray',
      });
    });

    test('handles singular units correctly for past trips', () => {
      const tripEnd = mockNow.minus({
        years: 1,
        months: 1,
        weeks: 1,
        days: 1,
        hours: 1,
        minutes: 1,
      });
      const tripStart = tripEnd.minus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '1 year, 1 month ago',
        color: 'gray',
      });
    });
    test('shows three significant units with "and" for past trips', () => {
      const tripEnd = mockNow.minus({ weeks: 2, days: 3, hours: 4 });
      const tripStart = tripEnd.minus({ days: 7 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.text).toContain('and');
      expect(result?.text).toContain('ago');
      expect(result?.text).toMatch(/2 weeks, 3 days and \d+ hours ago/);
    });
  });

  describe('timezone handling', () => {
    test('works with different timezones', () => {
      // Trip in Tokyo timezone starting tomorrow
      const tokyoTime = mockNow.setZone('Asia/Tokyo');
      const tripStart = tokyoTime.plus({ days: 1 }).startOf('day');
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('upcoming');
      expect(result?.color).toBe('blue');
    });
  });
  describe('edge cases with time boundaries', () => {
    test('trip starting exactly now', () => {
      const tripStart = mockNow;
      const tripEnd = mockNow.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('current');
    });

    test('trip ending exactly now', () => {
      const tripStart = mockNow.minus({ days: 3 });
      const tripEnd = mockNow;

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('past');
    });
  });
  describe('precise time comparison logic', () => {
    test('trip starting later today shows upcoming, not current', () => {
      // Trip starts 6 hours from now
      const tripStart = mockNow.plus({ hours: 6 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 6 hours',
        color: 'blue',
      });
    });

    test('trip started earlier today shows current, not upcoming', () => {
      // Trip started 4 hours ago and runs for 3 days
      const tripStart = mockNow.minus({ hours: 4 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });

    test('trip ending later today shows current, not past', () => {
      // Trip started 2 days ago and ends 8 hours from now
      const tripEnd = mockNow.plus({ hours: 8 });
      const tripStart = tripEnd.minus({ days: 2 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });

    test('trip ended earlier today shows past, not current', () => {
      // Trip ended 2 hours ago
      const tripEnd = mockNow.minus({ hours: 2 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '2 hours ago',
        color: 'gray',
      });
    });

    test('trip starting in 30 minutes shows upcoming with precise countdown', () => {
      const tripStart = mockNow.plus({ minutes: 30 });
      const tripEnd = tripStart.plus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 30 minutes',
        color: 'blue',
      });
    });

    test('trip that ended 30 minutes ago shows past with precise time', () => {
      const tripEnd = mockNow.minus({ minutes: 30 });
      const tripStart = tripEnd.minus({ days: 3 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '30 minutes ago',
        color: 'gray',
      });
    });

    test('single-day trip with precise start/end times', () => {
      // Trip started 3 hours ago and ends in 5 hours (8 hour trip)
      const tripStart = mockNow.minus({ hours: 3 });
      const tripEnd = mockNow.plus({ hours: 5 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });

    test('single-day trip that has not started yet', () => {
      // Trip starts in 2 hours and ends in 6 hours
      const tripStart = mockNow.plus({ hours: 2 });
      const tripEnd = mockNow.plus({ hours: 6 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 hours',
        color: 'blue',
      });
    });

    test('single-day trip that has already ended', () => {
      // Trip started 4 hours ago and ended 1 hour ago
      const tripStart = mockNow.minus({ hours: 4 });
      const tripEnd = mockNow.minus({ hours: 1 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '1 hour ago',
        color: 'gray',
      });
    });

    test('trip spanning midnight with precise timing', () => {
      // Trip started yesterday and ends tomorrow (currently in progress)
      const tripStart = mockNow.minus({ days: 1 });
      const tripEnd = mockNow.plus({ days: 1 });

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress',
        color: 'green',
      });
    });
  });
});
