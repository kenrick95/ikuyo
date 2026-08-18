import { describe, expect, test } from 'vitest';
import type { TripSliceActivity } from '../../store/types';
import { computeSwapDayActivityUpdates } from './swapDay';

const TZ = 'America/New_York';

function dayStart(year: number, month: number, day: number): number {
  return Temporal.ZonedDateTime.from({
    timeZone: TZ,
    year,
    month,
    day,
    hour: 0,
  })
    .startOfDay()
    .toInstant().epochMilliseconds;
}

function activity(
  id: string,
  startYear: number,
  startMonth: number,
  startDay: number,
  startHour: number,
  durationMs: number,
): TripSliceActivity {
  const startMs = Temporal.ZonedDateTime.from({
    timeZone: TZ,
    year: startYear,
    month: startMonth,
    day: startDay,
    hour: startHour,
  }).toInstant().epochMilliseconds;
  return {
    id,
    title: id,
    description: '',
    location: '',
    locationLat: undefined,
    locationLng: undefined,
    locationZoom: undefined,
    locationDestination: undefined,
    locationDestinationLat: undefined,
    locationDestinationLng: undefined,
    locationDestinationZoom: undefined,
    timestampStart: startMs,
    timestampEnd: startMs + durationMs,
    timeZoneStart: TZ,
    timeZoneEnd: TZ,
    createdAt: 0,
    lastUpdatedAt: 0,
    flags: undefined,
    icon: undefined,
    tripId: 'trip1',
    commentGroupId: undefined,
  };
}

function localTimeOf(
  epochMs: number,
): [number, number, number, number, number] {
  const d =
    Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(TZ);
  return [d.year, d.month, d.day, d.hour, d.minute];
}

describe('computeSwapDayActivityUpdates', () => {
  const sourceDayStartMs = dayStart(2026, 3, 3); // Day 3
  const targetDayStartMs = dayStart(2026, 3, 8); // Day 8

  test('swaps activities between the two days, preserving time of day', () => {
    const activities = [
      activity('a-source', 2026, 3, 3, 10, 60 * 60 * 1000),
      activity('a-target', 2026, 3, 8, 14, 2 * 60 * 60 * 1000),
      activity('a-other', 2026, 3, 5, 9, 60 * 60 * 1000),
    ];

    const updates = computeSwapDayActivityUpdates({
      activities,
      sourceDayStartMs,
      targetDayStartMs,
      timeZone: TZ,
    });

    expect(updates).toHaveLength(2);

    const sourceUpdate = updates.find((u) => u.id === 'a-source');
    // 10:00 on Day 3 should land at 10:00 on Day 8
    expect(localTimeOf(sourceUpdate?.timestampStart ?? 0)).toEqual([
      2026, 3, 8, 10, 0,
    ]);
    // Duration preserved (1 hour)
    expect(
      (sourceUpdate?.timestampEnd ?? 0) - (sourceUpdate?.timestampStart ?? 0),
    ).toBe(60 * 60 * 1000);

    const targetUpdate = updates.find((u) => u.id === 'a-target');
    // 14:00 on Day 8 should land at 14:00 on Day 3
    expect(localTimeOf(targetUpdate?.timestampStart ?? 0)).toEqual([
      2026, 3, 3, 14, 0,
    ]);
    expect(
      (targetUpdate?.timestampEnd ?? 0) - (targetUpdate?.timestampStart ?? 0),
    ).toBe(2 * 60 * 60 * 1000);

    // Activities on other days are untouched
    expect(updates.find((u) => u.id === 'a-other')).toBeUndefined();
  });

  test('leaves activities without a start time alone', () => {
    const noTime: TripSliceActivity = activity('a-null', 2026, 3, 3, 10, 0);
    noTime.timestampStart = null;
    noTime.timestampEnd = null;

    const updates = computeSwapDayActivityUpdates({
      activities: [noTime],
      sourceDayStartMs,
      targetDayStartMs,
      timeZone: TZ,
    });

    expect(updates).toHaveLength(0);
  });

  test('returns empty when there is nothing to move', () => {
    const activities = [activity('a-other', 2026, 3, 5, 9, 60 * 60 * 1000)];

    const updates = computeSwapDayActivityUpdates({
      activities,
      sourceDayStartMs,
      targetDayStartMs,
      timeZone: TZ,
    });

    expect(updates).toHaveLength(0);
  });

  test('is a no-op when both days are the same', () => {
    const activities = [activity('a-source', 2026, 3, 3, 10, 60 * 60 * 1000)];

    const updates = computeSwapDayActivityUpdates({
      activities,
      sourceDayStartMs,
      targetDayStartMs: sourceDayStartMs,
      timeZone: TZ,
    });

    // Shifting a day onto itself yields identical timestamps, so no updates
    expect(updates).toHaveLength(0);
  });
});
