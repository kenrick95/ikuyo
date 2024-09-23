import { describe, expect, test } from 'vitest';
import { groupActivitiesByDays } from './eventGrouping';
import { DbActivityWithTrip, DbTripWithActivity } from '../data/types';

describe('Trip', () => {
  const baseTrip: DbTripWithActivity = {
    id: 'trip-0',
    title: 'Trip 0',
    timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
    timestampEnd: new Date('2024-09-25T00:00:00Z').getTime(),
    timeZone: 'UTC',
    activity: [],
    user: undefined,
  };
  function createActivity(
    activity: Partial<DbActivityWithTrip>
  ): DbActivityWithTrip {
    return {
      id: 'act-1',
      title: 'act-1',
      timestampStart: new Date('2024-09-23T01:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-23T02:00:00Z').getTime(),
      createdAt: 0,
      lastUpdatedAt: 0,
      location: '',
      description: '',
      trip: baseTrip,
      ...activity,
    };
  }
  test('Non-overlapping activities', () => {
    const activities: DbActivityWithTrip[] = [
      createActivity({
        id: 'act-0',
        title: 'act-0',
        timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T01:00:00Z').getTime(),
      }),
      createActivity({
        id: 'act-1',
        title: 'act-1',
        timestampStart: new Date('2024-09-23T01:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T02:00:00Z').getTime(),
      }),
      createActivity({
        id: 'act-2',
        title: 'act-2',
        timestampStart: new Date('2024-09-23T02:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T03:00:00Z').getTime(),
      }),
      createActivity({
        id: 'act-3',
        title: 'act-3',
        timestampStart: new Date('2024-09-24T02:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-24T03:00:00Z').getTime(),
      }),
    ];
    const trip: DbTripWithActivity = {
      ...baseTrip,
      activity: activities,
    };
    const result = groupActivitiesByDays(trip);
    expect(result.length).toBe(2);
    expect(result[0].columns).toBe(1);
    expect(result[0].activities.length).toBe(3);
    expect(result[1].columns).toBe(1);
    expect(result[1].activities.length).toBe(1);
  });
  test('Overlap = 2 on day 1', () => {
    /***
     * |    Day 1    |
     *
     * +-----+
     * |act-0| +-----+
     * +-----+ |act-1|
     *         +-----+
     *
     * +-------------+
     * |act-2        |
     * +-------------+
     *
     */
    const activities: DbActivityWithTrip[] = [
      createActivity({
        id: 'act-0',
        title: 'act-0',
        timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T01:00:00Z').getTime(),
      }),
      createActivity({
        id: 'act-1',
        title: 'act-1',
        timestampStart: new Date('2024-09-23T00:30:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T01:30:00Z').getTime(),
      }),
      createActivity({
        id: 'act-2',
        title: 'act-2',
        timestampStart: new Date('2024-09-23T02:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T03:00:00Z').getTime(),
      }),
    ];
    const trip: DbTripWithActivity = {
      ...baseTrip,
      activity: activities,
    };
    const result = groupActivitiesByDays(trip);
    expect(result.length).toBe(2);
    expect(result[0].columns).toBe(2);
    expect(result[0].activities.length).toBe(3);
    const day1Columns = result[0].activityColumnIndexMap;
    expect(day1Columns.get('act-0')?.start).toBe(1);
    expect(day1Columns.get('act-0')?.end).toBe(1);
    expect(day1Columns.get('act-1')?.start).toBe(2);
    expect(day1Columns.get('act-1')?.end).toBe(2);
    expect(day1Columns.get('act-2')?.start).toBe(1);
    expect(day1Columns.get('act-2')?.end).toBe(2);
  });
  test('Max overlap = 2 on day 1 with three events close to each other', () => {
    /***
     * |    Day 1    |
     *
     * +-----+
     * |act-0| +-----+
     * +-----+ |act-1|
     * |act-2| +-----+
     * +-----+
     *
     */
    const activities: DbActivityWithTrip[] = [
      createActivity({
        id: 'act-0',
        title: 'act-0',
        timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T01:00:00Z').getTime(),
      }),
      createActivity({
        id: 'act-1',
        title: 'act-1',
        timestampStart: new Date('2024-09-23T00:30:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T01:30:00Z').getTime(),
      }),
      createActivity({
        id: 'act-2',
        title: 'act-2',
        timestampStart: new Date('2024-09-23T01:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T02:00:00Z').getTime(),
      }),
    ];
    const trip: DbTripWithActivity = {
      ...baseTrip,
      activity: activities,
    };
    const result = groupActivitiesByDays(trip);
    expect(result.length).toBe(2);
    expect(result[0].columns).toBe(2);
    expect(result[0].activities.length).toBe(3);
    const day1Columns = result[0].activityColumnIndexMap;
    expect(day1Columns.get('act-0')?.start).toBe(1);
    expect(day1Columns.get('act-0')?.end).toBe(1);
    expect(day1Columns.get('act-1')?.start).toBe(2);
    expect(day1Columns.get('act-1')?.end).toBe(2);
    expect(day1Columns.get('act-2')?.start).toBe(1);
    expect(day1Columns.get('act-2')?.end).toBe(1);
  });
});
