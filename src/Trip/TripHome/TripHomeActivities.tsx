import { Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Activity } from '../../Activity/Activity';
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

  // Upcoming activities (next 48 hours)
  const upcomingActivities = useMemo(() => {
    if (!activities || !trip) return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const next48Hours = now.plus({ hours: 48 });

    return activities
      .filter((activity) => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = DateTime.fromMillis(
          activity.timestampStart,
        ).setZone(trip.timeZone);
        return activityStart >= now && activityStart <= next48Hours;
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0))
      .slice(0, 5) as TripSliceActivityWithTime[];
  }, [activities, trip]);

  return (
    <>
      <Heading as="h3" size="4">
        Upcoming Activities
      </Heading>
      <Flex gap="2" direction="column">
        {upcomingActivities.length === 0 && (
          <Text size="2">No upcoming activities</Text>
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
