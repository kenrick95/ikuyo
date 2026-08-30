import { describe, expect, test } from 'vitest';
import type {
  TripSliceAccommodation,
  TripSliceTrip,
} from '../Trip/store/types';
import { getDefaultAccommodationCheckInDate } from './defaultCheckInDate';

const timeZone = 'Asia/Singapore';

function timestamp(day: number, hour: number): number {
  return Temporal.ZonedDateTime.from({
    timeZone,
    year: 2026,
    month: 3,
    day,
    hour,
  }).epochMilliseconds;
}

const trip = {
  id: 'trip',
  timestampStart: timestamp(1, 0),
  timestampEnd: timestamp(6, 0),
  timeZone,
  accommodationIds: [],
} as TripSliceTrip;

function accommodation(
  timestampCheckIn: number,
  timestampCheckOut: number,
): TripSliceAccommodation {
  return { timestampCheckIn, timestampCheckOut } as TripSliceAccommodation;
}

describe('getDefaultAccommodationCheckInDate', () => {
  test('uses the first empty trip day', () => {
    const result = getDefaultAccommodationCheckInDate(trip, [
      accommodation(timestamp(1, 15), timestamp(2, 11)),
      accommodation(timestamp(4, 15), timestamp(5, 11)),
    ]);

    expect(result.toString()).toBe('2026-03-03');
  });

  test('falls back to the trip start when every eligible day is occupied', () => {
    const result = getDefaultAccommodationCheckInDate(trip, [
      accommodation(timestamp(1, 15), timestamp(5, 11)),
    ]);

    expect(result.toString()).toBe('2026-03-01');
  });
});
