import { describe, expect, test } from 'vitest';
import { AccommodationDisplayTimeMode } from '../Accommodation/AccommodationDisplayTimeMode';
import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceTrip,
} from '../Trip/store/types';
import { groupActivitiesByDays } from './eventGrouping';

describe('Trip', () => {
  const baseTrip: TripSliceTrip = {
    id: 'trip-0',
    title: 'Trip 0',
    timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
    timestampEnd: new Date('2024-09-25T00:00:00Z').getTime(),
    timeZone: 'UTC',
    currency: 'GBP',
    originCurrency: 'USD',
    region: 'GB',
    activityIds: [],
    accommodationIds: [],
    macroplanIds: [],
    commentGroupIds: [],
    tripUserIds: [],
    expenseIds: [],
  };
  function createActivity(
    activity: Partial<TripSliceActivity>,
  ): TripSliceActivity {
    return {
      id: 'act-1',
      title: 'act-1',
      timestampStart: new Date('2024-09-23T01:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-23T02:00:00Z').getTime(),
      createdAt: 0,
      lastUpdatedAt: 0,
      location: '',
      locationLat: undefined,
      locationLng: undefined,
      locationZoom: undefined,
      commentGroupId: undefined,
      description: '',
      tripId: baseTrip.id,
      ...activity,
    };
  }
  function createAccommodation(
    accommodation: Partial<TripSliceAccommodation>,
  ): TripSliceAccommodation {
    return {
      id: 'acc-1',
      name: 'acc-1',
      timestampCheckIn: new Date('2024-09-23T15:00:00Z').getTime(),
      timestampCheckOut: new Date('2024-09-24T11:00:00Z').getTime(),
      createdAt: 0,
      lastUpdatedAt: 0,
      notes: '',
      address: '',
      phoneNumber: '',
      tripId: baseTrip.id,
      commentGroupId: undefined,
      ...accommodation,
    };
  }
  test('Non-overlapping activities', () => {
    const activities: TripSliceActivity[] = [
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
    const accommodations: TripSliceAccommodation[] = [
      createAccommodation({
        id: 'acc-0',
        name: 'acc-0',
        timestampCheckIn: new Date('2024-09-23T15:00:00Z').getTime(),
        timestampCheckOut: new Date('2024-09-24T11:00:00Z').getTime(),
      }),
    ];
    const trip: TripSliceTrip = {
      ...baseTrip,
      activityIds: activities.map((a) => a.id),
      accommodationIds: accommodations.map((a) => a.id),
    };
    const result = groupActivitiesByDays({
      trip,
      activities,
      accommodations,
      macroplans: [],
    });
    expect(result.length).toBe(2);
    expect(result[0].columns).toBe(1);
    expect(result[0].activities.length).toBe(3);
    expect(result[1].columns).toBe(1);
    expect(result[1].activities.length).toBe(1);
    expect(result[0].accommodations.length).toBe(1);
    expect(result[0].accommodationProps.get('acc-0')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckIn,
    );
    expect(result[1].accommodations.length).toBe(1);
    expect(result[1].accommodationProps.get('acc-0')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckOut,
    );
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
    const activities: TripSliceActivity[] = [
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
    const trip: TripSliceTrip = {
      ...baseTrip,
      activityIds: activities.map((a) => a.id),
    };
    const result = groupActivitiesByDays({
      trip,
      activities,
      macroplans: [],
      accommodations: [],
    });
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
    const activities: TripSliceActivity[] = [
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
    const trip: TripSliceTrip = {
      ...baseTrip,
      activityIds: activities.map((a) => a.id),
    };
    const result = groupActivitiesByDays({
      trip,
      activities,
      macroplans: [],
      accommodations: [],
    });
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

  test('Three day trip, two accomodations', () => {
    const accommodations: TripSliceAccommodation[] = [
      createAccommodation({
        id: 'acc-0',
        name: 'acc-0',
        timestampCheckIn: new Date('2024-09-23T15:00:00Z').getTime(),
        timestampCheckOut: new Date('2024-09-24T11:00:00Z').getTime(),
      }),
      createAccommodation({
        id: 'acc-1',
        name: 'acc-1',
        timestampCheckIn: new Date('2024-09-24T15:00:00Z').getTime(),
        timestampCheckOut: new Date('2024-09-25T11:00:00Z').getTime(),
      }),
    ];
    const trip: TripSliceTrip = {
      ...baseTrip,
      timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-26T00:00:00Z').getTime(),
      accommodationIds: accommodations.map((a) => a.id),
    };
    const result = groupActivitiesByDays({
      trip,
      activities: [],
      macroplans: [],
      accommodations,
    });
    expect(result.length).toBe(3);
    expect(result[0].accommodations.length).toBe(1);
    expect(result[0].accommodationProps.get('acc-0')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckIn,
    );
    expect(result[1].accommodations.length).toBe(2);
    expect(result[1].accommodationProps.get('acc-0')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckOut,
    );
    expect(result[1].accommodationProps.get('acc-1')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckIn,
    );
    expect(result[2].accommodations.length).toBe(1);
    expect(result[2].accommodationProps.get('acc-1')?.displayTimeMode).toBe(
      AccommodationDisplayTimeMode.CheckOut,
    );
  });
});
