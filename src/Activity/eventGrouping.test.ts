import { describe, expect, test } from 'vitest';
import { AccommodationDisplayTimeMode } from '../Accommodation/AccommodationDisplayTimeMode';
import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceTrip,
} from '../Trip/store/types';
import { TripSharingLevel } from '../Trip/tripSharingLevel';
import { TripUserRole } from '../User/TripUserRole';
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
    taskListIds: [],
    currentUserRole: TripUserRole.Owner,
    sharingLevel: TripSharingLevel.Private,
  } satisfies TripSliceTrip;
  function createActivity(
    activity: Partial<TripSliceActivity>,
  ): TripSliceActivity {
    return {
      id: 'act-1',
      title: 'act-1',
      timestampStart: new Date('2024-09-23T01:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-23T02:00:00Z').getTime(),
      timeZoneStart: 'UTC',
      timeZoneEnd: 'UTC',
      createdAt: 0,
      lastUpdatedAt: 0,
      location: '',
      locationLat: undefined,
      locationLng: undefined,
      locationZoom: undefined,
      locationDestination: undefined,
      locationDestinationLat: undefined,
      locationDestinationLng: undefined,
      locationDestinationZoom: undefined,
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
      timeZoneCheckIn: 'UTC',
      timeZoneCheckOut: 'UTC',
      createdAt: 0,
      lastUpdatedAt: 0,
      notes: '',
      address: '',
      phoneNumber: '',
      tripId: baseTrip.id,
      commentGroupId: undefined,
      locationLat: undefined,
      locationLng: undefined,
      locationZoom: undefined,
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
      createActivity({
        id: 'act-outside-1',
        title: 'act-outside-1',
        timestampStart: null,
        timestampEnd: null,
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
    expect(result.ideas.activities.length).toBe(1);
    expect(result.inTrip.length).toBe(2);
    expect(result.inTrip[0].columns).toBe(1);
    expect(result.inTrip[0].activities.length).toBe(3);
    expect(result.inTrip[1].columns).toBe(1);
    expect(result.inTrip[1].activities.length).toBe(1);
    expect(result.inTrip[0].accommodations.length).toBe(1);
    expect(
      result.inTrip[0].accommodationProps.get('acc-0')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckIn);
    expect(result.inTrip[1].accommodations.length).toBe(1);
    expect(
      result.inTrip[1].accommodationProps.get('acc-0')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckOut);
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
    expect(result.inTrip.length).toBe(2);
    expect(result.inTrip[0].columns).toBe(2);
    expect(result.inTrip[0].activities.length).toBe(3);
    const day1Columns = result.inTrip[0].activityColumnIndexMap;
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
    expect(result.inTrip.length).toBe(2);
    expect(result.inTrip[0].columns).toBe(2);
    expect(result.inTrip[0].activities.length).toBe(3);
    const day1Columns = result.inTrip[0].activityColumnIndexMap;
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
    expect(result.inTrip.length).toBe(3);
    expect(result.inTrip[0].accommodations.length).toBe(1);
    expect(
      result.inTrip[0].accommodationProps.get('acc-0')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckIn);
    expect(result.inTrip[1].accommodations.length).toBe(2);
    expect(
      result.inTrip[1].accommodationProps.get('acc-0')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckOut);
    expect(
      result.inTrip[1].accommodationProps.get('acc-1')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckIn);
    expect(result.inTrip[2].accommodations.length).toBe(1);
    expect(
      result.inTrip[2].accommodationProps.get('acc-1')?.displayTimeMode,
    ).toBe(AccommodationDisplayTimeMode.CheckOut);
  });

  test('Activity spanning multiple days: "split" it as two activities', () => {
    const activities: TripSliceActivity[] = [
      createActivity({
        id: 'act-0',
        title: 'act-0',
        timestampStart: new Date('2024-09-23T23:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-24T02:00:00Z').getTime(),
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
    expect(result.inTrip.length).toBe(2);
    expect(result.inTrip[0].activities.length).toBe(1);
    expect(result.inTrip[1].activities.length).toBe(1);

    // Verify it's the same activity on both days
    expect(result.inTrip[0].activities[0].id).toBe('act-0');
    expect(result.inTrip[1].activities[0].id).toBe('act-0');

    // Verify the activities have clipped times for each day
    const day1Activity = result.inTrip[0].activities[0];
    const day2Activity = result.inTrip[1].activities[0];

    // Day 1: should run from 23:00 to end of day (24:00 = start of next day)
    expect(day1Activity.timestampStart).toBe(
      new Date('2024-09-23T23:00:00Z').getTime(),
    );
    expect(day1Activity.timestampEnd).toBe(
      new Date('2024-09-24T00:00:00Z').getTime(),
    );

    // Day 2: should run from start of day (00:00) to 02:00
    expect(day2Activity.timestampStart).toBe(
      new Date('2024-09-24T00:00:00Z').getTime(),
    );
    expect(day2Activity.timestampEnd).toBe(
      new Date('2024-09-24T02:00:00Z').getTime(),
    );
  });

  test('Multiple activities with some spanning multiple days', () => {
    const activities: TripSliceActivity[] = [
      // Regular activity on day 1
      createActivity({
        id: 'act-regular',
        title: 'Regular Activity',
        timestampStart: new Date('2024-09-23T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T12:00:00Z').getTime(),
      }),
      // Multi-day activity
      createActivity({
        id: 'act-multiday',
        title: 'Multi-day Activity',
        timestampStart: new Date('2024-09-23T22:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-24T03:00:00Z').getTime(),
      }),
      // Regular activity on day 2 that overlaps with the multi-day activity
      createActivity({
        id: 'act-overlap',
        title: 'Overlapping Activity',
        timestampStart: new Date('2024-09-24T01:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-24T04:00:00Z').getTime(),
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

    expect(result.inTrip.length).toBe(2);

    // Day 1: should have regular activity + first part of multi-day activity
    expect(result.inTrip[0].activities.length).toBe(2);
    const day1Activities = result.inTrip[0].activities;
    expect(day1Activities.find((a) => a.id === 'act-regular')).toBeDefined();
    expect(day1Activities.find((a) => a.id === 'act-multiday')).toBeDefined();

    // Day 2: should have second part of multi-day activity + overlapping activity
    expect(result.inTrip[1].activities.length).toBe(2);
    const day2Activities = result.inTrip[1].activities;
    expect(day2Activities.find((a) => a.id === 'act-multiday')).toBeDefined();
    expect(day2Activities.find((a) => a.id === 'act-overlap')).toBeDefined();

    // Verify multi-day activity has correct clipped times
    const day1MultiDay = day1Activities.find((a) => a.id === 'act-multiday');
    const day2MultiDay = day2Activities.find((a) => a.id === 'act-multiday');

    expect(day1MultiDay).toBeDefined();
    expect(day2MultiDay).toBeDefined();

    if (day1MultiDay && day2MultiDay) {
      expect(day1MultiDay.timestampStart).toBe(
        new Date('2024-09-23T22:00:00Z').getTime(),
      );
      expect(day1MultiDay.timestampEnd).toBe(
        new Date('2024-09-24T00:00:00Z').getTime(),
      );

      expect(day2MultiDay.timestampStart).toBe(
        new Date('2024-09-24T00:00:00Z').getTime(),
      );
      expect(day2MultiDay.timestampEnd).toBe(
        new Date('2024-09-24T03:00:00Z').getTime(),
      );
    }

    // Day 2 should have 2 columns due to overlap between multi-day and overlap activities
    expect(result.inTrip[1].columns).toBe(2);
  });

  test('Activity spanning more than 24 hours (3 days)', () => {
    const activities: TripSliceActivity[] = [
      createActivity({
        id: 'act-long',
        title: 'Long Activity',
        timestampStart: new Date('2024-09-23T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-25T14:00:00Z').getTime(), // Spans 3 days
      }),
      // Add another activity on day 2 to test overlap
      createActivity({
        id: 'act-day2',
        title: 'Day 2 Activity',
        timestampStart: new Date('2024-09-24T12:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-24T15:00:00Z').getTime(),
      }),
    ];

    const trip: TripSliceTrip = {
      ...baseTrip,
      timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-26T00:00:00Z').getTime(), // 3-day trip
      activityIds: activities.map((a) => a.id),
    };

    const result = groupActivitiesByDays({
      trip,
      activities,
      macroplans: [],
      accommodations: [],
    });

    expect(result.inTrip.length).toBe(3);

    // Day 1: should have the long activity
    expect(result.inTrip[0].activities.length).toBe(1);
    expect(result.inTrip[0].activities[0].id).toBe('act-long');

    // Day 2: should have both the long activity and day 2 activity
    expect(result.inTrip[1].activities.length).toBe(2);
    const day2Activities = result.inTrip[1].activities;
    expect(day2Activities.find((a) => a.id === 'act-long')).toBeDefined();
    expect(day2Activities.find((a) => a.id === 'act-day2')).toBeDefined();

    // Day 3: should have only the long activity
    expect(result.inTrip[2].activities.length).toBe(1);
    expect(result.inTrip[2].activities[0].id).toBe('act-long');

    // Verify time clipping for each day
    const day1LongActivity = result.inTrip[0].activities[0];
    const day2LongActivity = day2Activities.find((a) => a.id === 'act-long');
    const day3LongActivity = result.inTrip[2].activities[0];

    if (day2LongActivity) {
      // Day 1: 10:00 to end of day (24:00)
      expect(day1LongActivity.timestampStart).toBe(
        new Date('2024-09-23T10:00:00Z').getTime(),
      );
      expect(day1LongActivity.timestampEnd).toBe(
        new Date('2024-09-24T00:00:00Z').getTime(),
      );

      // Day 2: start of day (00:00) to end of day (24:00)
      expect(day2LongActivity.timestampStart).toBe(
        new Date('2024-09-24T00:00:00Z').getTime(),
      );
      expect(day2LongActivity.timestampEnd).toBe(
        new Date('2024-09-25T00:00:00Z').getTime(),
      );

      // Day 3: start of day (00:00) to 14:00
      expect(day3LongActivity.timestampStart).toBe(
        new Date('2024-09-25T00:00:00Z').getTime(),
      );
      expect(day3LongActivity.timestampEnd).toBe(
        new Date('2024-09-25T14:00:00Z').getTime(),
      );

      // Day 2 should have 2 columns due to overlap
      expect(result.inTrip[1].columns).toBe(2);
    }
  });

  test('Multiple activities with different durations spanning various days', () => {
    const activities: TripSliceActivity[] = [
      // Activity spanning entire trip (5 days)
      createActivity({
        id: 'act-entire-trip',
        title: 'Entire Trip Activity',
        timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-28T00:00:00Z').getTime(),
      }),
      // Short activity on day 1
      createActivity({
        id: 'act-short-day1',
        title: 'Short Day 1',
        timestampStart: new Date('2024-09-23T10:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-23T12:00:00Z').getTime(),
      }),
      // Activity spanning days 2-4
      createActivity({
        id: 'act-mid-span',
        title: 'Mid Span Activity',
        timestampStart: new Date('2024-09-24T08:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-26T16:00:00Z').getTime(),
      }),
      // Short activity on day 5
      createActivity({
        id: 'act-short-day5',
        title: 'Short Day 5',
        timestampStart: new Date('2024-09-27T14:00:00Z').getTime(),
        timestampEnd: new Date('2024-09-27T18:00:00Z').getTime(),
      }),
    ];

    const trip: TripSliceTrip = {
      ...baseTrip,
      timestampStart: new Date('2024-09-23T00:00:00Z').getTime(),
      timestampEnd: new Date('2024-09-28T00:00:00Z').getTime(), // 5-day trip
      activityIds: activities.map((a) => a.id),
    };

    const result = groupActivitiesByDays({
      trip,
      activities,
      macroplans: [],
      accommodations: [],
    });

    expect(result.inTrip.length).toBe(5);

    // Day 1: entire trip activity + short day 1 activity
    expect(result.inTrip[0].activities.length).toBe(2);
    expect(result.inTrip[0].columns).toBe(2); // Should have 2 columns due to overlap

    // Day 2: entire trip activity + mid span activity (both start from beginning of day)
    expect(result.inTrip[1].activities.length).toBe(2);
    expect(result.inTrip[1].columns).toBe(2);

    // Day 3: entire trip activity + mid span activity (both span entire day)
    expect(result.inTrip[2].activities.length).toBe(2);
    expect(result.inTrip[2].columns).toBe(2);

    // Day 4: entire trip activity + mid span activity (mid span ends at 16:00)
    expect(result.inTrip[3].activities.length).toBe(2);
    expect(result.inTrip[3].columns).toBe(2);

    // Day 5: entire trip activity + short day 5 activity
    expect(result.inTrip[4].activities.length).toBe(2);
    expect(result.inTrip[4].columns).toBe(2);

    // Verify that all activities appear on all expected days
    for (let day = 0; day < 5; day++) {
      const dayActivities = result.inTrip[day].activities;
      expect(
        dayActivities.find((a) => a.id === 'act-entire-trip'),
      ).toBeDefined();
    }

    // Verify mid-span activity appears on days 2, 3, 4 (indices 1, 2, 3)
    for (let day = 1; day <= 3; day++) {
      const dayActivities = result.inTrip[day].activities;
      expect(dayActivities.find((a) => a.id === 'act-mid-span')).toBeDefined();
    }

    // Verify short activities only appear on their respective days
    expect(
      result.inTrip[0].activities.find((a) => a.id === 'act-short-day1'),
    ).toBeDefined();
    expect(
      result.inTrip[4].activities.find((a) => a.id === 'act-short-day5'),
    ).toBeDefined();
  });
});
