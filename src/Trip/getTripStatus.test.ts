import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { getTripStatus } from './getTripStatus';

describe('getTripStatus', () => {
  const defaultMockNow = Temporal.ZonedDateTime.from(
    '2025-06-18T12:00:00[UTC]',
  );

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(defaultMockNow.epochMilliseconds);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('edge cases', () => {
    test('returns null when tripStart is undefined', () => {
      const tripEnd = defaultMockNow.add({ days: 1 }).startOfDay();
      expect(getTripStatus(undefined, tripEnd)).toBeNull();
    });

    test('returns null when tripEnd is undefined', () => {
      const tripStart = defaultMockNow.add({ days: 1 }).startOfDay();
      expect(getTripStatus(tripStart, undefined)).toBeNull();
    });

    test('returns null when both are undefined', () => {
      expect(getTripStatus(undefined, undefined)).toBeNull();
    });
  });

  describe('upcoming trips', () => {
    test('trip starting in minutes shows minutes', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({ minutes: 30 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 30 minutes',
        color: 'blue',
      });
    });

    test('trip starting very soon shows "Starting soon"', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({ seconds: 30 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'Starting soon',
        color: 'blue',
      });
    });

    test('trip starting in hours and minutes shows both', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        hours: 5,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 5 hours, 45 minutes',
        color: 'blue',
      });
    });

    test('trip starting in days and hours shows both', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        days: 3,
        hours: 8,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 3 days, 8 hours',
        color: 'blue',
      });
    });

    test('trip starting in weeks and days shows both', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        weeks: 2,
        days: 3,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 weeks, 3 days',
        color: 'blue',
      });
    });

    test('trip starting in months and weeks shows both', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        months: 2,
        weeks: 1,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 months, 1 week',
        color: 'blue',
      });
    });

    test('trip starting in years and months shows both', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        years: 1,
        months: 6,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 1 year, 6 months',
        color: 'blue',
      });
    });

    test('trip starting in multiple years shows years and months', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        years: 2,
        months: 3,
        minutes: 45,
        seconds: 30,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 2 years, 3 months',
        color: 'blue',
      });
    });

    test('handles singular units correctly', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        years: 1,
        months: 1,
        weeks: 1,
        days: 1,
        hours: 1,
        minutes: 1,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'upcoming',
        text: 'In 1 year, 1 month',
        color: 'blue',
      });
    });
    test('shows three significant units with "and"', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart.subtract({
        weeks: 3,
        days: 2,
        hours: 5,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.text).toContain('and');
      expect(result?.text).toMatch(/3 weeks, 2 days, and \d+ hours/);
    });
  });

  describe('current trips', () => {
    test('trip happening now shows "Trip in progress"', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 1 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = defaultMockNow;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress: Day 2 of 3',
        color: 'green',
      });
    });
    test('should return progress for a single-day trip', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 1 });
      const mockNow = defaultMockNow;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);
      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress: Day 1 of 1',
        color: 'green',
      });
    });
    test('trip starting today shows "Trip in progress"', () => {
      const tripStart = defaultMockNow.startOfDay();
      const tripEnd = tripStart.add({ days: 4 });
      const mockNow = defaultMockNow;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress: Day 1 of 4',
        color: 'green',
      });
    });
    test('trip ending today shows "Trip in progress"', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 2 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = defaultMockNow;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'current',
        text: 'Trip in progress: Day 3 of 3',
        color: 'green',
      });
    });
  });

  describe('past trips', () => {
    test('trip ended minutes ago shows minutes', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ minutes: 45 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '45 minutes ago',
        color: 'gray',
      });
    });

    test('trip ended very recently shows "Just ended"', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ seconds: 30 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: 'Just ended',
        color: 'gray',
      });
    });

    test('trip ended hours and minutes ago shows both', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ hours: 3, minutes: 20 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '3 hours, 20 minutes ago',
        color: 'gray',
      });
    });

    test('trip ended days and hours ago shows both', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ days: 2, hours: 6 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '2 days, 6 hours ago',
        color: 'gray',
      });
    });

    test('trip ended weeks and days ago shows both', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ weeks: 1, days: 4 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '1 week, 4 days ago',
        color: 'gray',
      });
    });

    test('trip ended months and weeks ago shows both', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ months: 3, weeks: 2 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '3 months, 2 weeks ago',
        color: 'gray',
      });
    });

    test('trip ended years and months ago shows both', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({ years: 2, months: 4 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '2 years, 4 months ago',
        color: 'gray',
      });
    });

    test('handles singular units correctly for past trips', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({
        years: 1,
        months: 1,
        weeks: 1,
        days: 1,
        hours: 1,
        minutes: 1,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result).toEqual({
        status: 'past',
        text: '1 year, 1 month ago',
        color: 'gray',
      });
    });
    test('shows three significant units with "and" for past trips', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd.add({
        weeks: 2,
        days: 3,
        hours: 4,
      });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.text).toContain('and');
      expect(result?.text).toContain('ago');
      expect(result?.text).toMatch(/2 weeks, 3 days, and \d+ hours ago/);
    });
  });

  describe('timezone handling', () => {
    test('works with different timezones', () => {
      // Trip in Tokyo timezone starting tomorrow
      const tripStart = defaultMockNow
        .withTimeZone('Asia/Tokyo')
        .startOfDay()
        .add({ days: 1 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart
        .withTimeZone('Europe/London')
        .subtract({ hours: 3 });
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('upcoming');
      expect(result?.text).toBe('In 3 hours');
      expect(result?.color).toBe('blue');
    });
  });
  describe('edge cases with time boundaries', () => {
    test('trip starting exactly now', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripStart;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('current');
    });

    test('trip ending exactly now', () => {
      const tripStart = defaultMockNow.startOfDay().subtract({ days: 7 });
      const tripEnd = tripStart.add({ days: 3 });
      const mockNow = tripEnd;
      vi.setSystemTime(mockNow.epochMilliseconds);

      const result = getTripStatus(tripStart, tripEnd);

      expect(result?.status).toBe('past');
    });
  });
});
