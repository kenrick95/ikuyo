import { Button, Flex, Heading, Text } from '@radix-ui/themes';

import { useMemo } from 'react';
import { Link } from 'wouter';
import { Activity } from '../../Activity/Activity';
import { RouteTripListView } from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip, useTripActivities } from '../store/hooks';
import type { TripSliceActivityWithTime } from '../store/types';
import { TripViewMode } from '../TripViewMode';

export function TripHomeActivities() {
  const { trip } = useCurrentTrip();
  // Get activities and expenses for new features
  const activities = useTripActivities(trip?.activityIds ?? []);
  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  // Determine if trip is {stating soon, or current}
  const isTripStartingOrCurrent = useMemo(() => {
    if (!trip) return false;
    const now = Temporal.Now.zonedDateTimeISO(trip.timeZone);
    const tripStartTwoDaysBefore = Temporal.Instant.fromEpochMilliseconds(
      trip.timestampStart,
    )
      .toZonedDateTimeISO(trip.timeZone)
      .subtract({ days: 2 })
      .startOfDay();
    const tripEnd = Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
      .toZonedDateTimeISO(trip.timeZone)
      .startOfDay()
      .add({ days: 1 });
    return (
      Temporal.ZonedDateTime.compare(now, tripStartTwoDaysBefore) >= 0 &&
      Temporal.ZonedDateTime.compare(now, tripEnd) <= 0
    );
  }, [trip]);

  // Today and tomorrow activities
  const upcomingActivities = useMemo(() => {
    if (!activities || !trip) return [];

    const now = Temporal.Now.zonedDateTimeISO(trip.timeZone);
    const todayStart = now.startOfDay();
    const tomorrowEnd = todayStart.add({ days: 2 });

    return activities
      .filter((activity): activity is TripSliceActivityWithTime => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = Temporal.Instant.fromEpochMilliseconds(
          activity.timestampStart,
        ).toZonedDateTimeISO(trip.timeZone);
        const activityEnd = Temporal.Instant.fromEpochMilliseconds(
          activity.timestampEnd,
        ).toZonedDateTimeISO(trip.timeZone);

        // Check if activity overlaps with the next 48 hours (today + tomorrow)
        // Activity overlaps if it starts before the end of the period AND ends after the start of the period
        return (
          Temporal.ZonedDateTime.compare(activityStart, tomorrowEnd) <= 0 &&
          Temporal.ZonedDateTime.compare(activityEnd, todayStart) >= 0
        );
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0));
  }, [activities, trip]);

  // Only show section if trip is starting soon or current
  if (!isTripStartingOrCurrent) {
    return null;
  }

  return (
    <>
      <Heading as="h3" size="4">
        Today & Upcoming Activities{' '}
        <Button
          variant="ghost"
          asChild
          size="1"
          ml="2"
          style={{ verticalAlign: 'baseline' }}
        >
          <Link to={RouteTripListView.asRouteTarget()}>View all</Link>
        </Button>
      </Heading>
      <Flex gap="2" direction="column">
        {upcomingActivities.length === 0 && (
          <Text size="2">No upcoming activities in the next 48 hours</Text>
        )}
        {upcomingActivities.map((activity) => {
          return (
            <Activity
              key={activity.id}
              activity={activity}
              columnIndex={0}
              columnEndIndex={0}
              tripViewMode={TripViewMode.Home}
              tripTimeZone={trip?.timeZone ?? 'UTC'}
              tripTimestampStart={0}
              userCanEditOrDelete={userCanModifyTrip}
            />
          );
        })}
      </Flex>
    </>
  );
}
