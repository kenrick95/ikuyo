import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
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

  // Determine if trip is {stating soon, or current, or past}
  const isTripStartingOrCurrentOrPast = useMemo(() => {
    if (!trip) return false;
    const now = DateTime.now().setZone(trip.timeZone);
    const tripStartTwoDaysBefore = DateTime.fromMillis(trip.timestampStart)
      .setZone(trip.timeZone)
      .minus({ days: 2 })
      .startOf('day');
    return now >= tripStartTwoDaysBefore;
  }, [trip]);

  // Today and tomorrow activities
  const upcomingActivities = useMemo(() => {
    if (!activities || !trip) return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const todayStart = now.startOf('day');
    const tomorrowEnd = todayStart.plus({ days: 2 }).endOf('day');

    return activities
      .filter((activity): activity is TripSliceActivityWithTime => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = DateTime.fromMillis(
          activity.timestampStart,
        ).setZone(trip.timeZone);
        const activityEnd = DateTime.fromMillis(activity.timestampEnd).setZone(
          trip.timeZone,
        );

        // Check if activity overlaps with the next 48 hours (today + tomorrow)
        // Activity overlaps if it starts before the end of the period AND ends after the start of the period
        return activityStart <= tomorrowEnd && activityEnd >= todayStart;
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0));
  }, [activities, trip]);

  // Only show section if trip is starting soon, current, or past
  if (!isTripStartingOrCurrentOrPast) {
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
