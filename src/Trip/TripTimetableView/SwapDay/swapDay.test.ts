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

  test('spans travel as a whole with the day they start on', () => {
    // An activity starting on Day 3 at 22:00 and ending on Day 4 at 04:00
    // (spans the day boundary).
    const spanning = activity('a-span', 2026, 3, 3, 22, 6 * 60 * 60 * 1000);

    const updates = computeSwapDayActivityUpdates({
      activities: [spanning],
      sourceDayStartMs,
      targetDayStartMs,
      timeZone: TZ,
    });

    // Exactly one update: it belongs to Day 3 (its start date), never twice.
    expect(updates).toHaveLength(1);
    const update = updates[0];
    expect(update.id).toBe('a-span');

    // Whole activity relocates to Day 8 at the same wall-clock time,
    // ending on Day 9. Duration is preserved.
    expect(localTimeOf(update.timestampStart ?? 0)).toEqual([
      2026, 3, 8, 22, 0,
    ]);
    expect(localTimeOf(update.timestampEnd ?? 0)).toEqual([2026, 3, 9, 4, 0]);
    expect((update.timestampEnd ?? 0) - (update.timestampStart ?? 0)).toBe(
      6 * 60 * 60 * 1000,
    );
  });

  test('a spanning activity is not moved when swapping the day it ends on', () => {
    // Same Day 3 -> Day 4 spanning activity; its end date is Day 4.
    const spanning = activity('a-span', 2026, 3, 3, 22, 6 * 60 * 60 * 1000);
    const dayFourStartMs = dayStart(2026, 3, 4);

    // Swapping Day 4 (where the activity ends) with Day 8 must NOT move it,
    // since it is only a member of its start day (Day 3).
    const updates = computeSwapDayActivityUpdates({
      activities: [spanning],
      sourceDayStartMs: dayFourStartMs,
      targetDayStartMs,
      timeZone: TZ,
    });

    expect(updates).toHaveLength(0);
  });
});
