import { Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Link } from 'wouter';
import {
  RouteTripListView,
  RouteTripListViewActivity,
} from '../../Routes/routes';
import { useCurrentTrip, useTripActivities } from '../store/hooks';

export function TripToday() {
  const { trip } = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const todayActivities = useMemo(() => {
    if (!activities || !trip) return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    return activities
      .filter((activity) => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = DateTime.fromMillis(
          activity.timestampStart,
        ).setZone(trip.timeZone);
        return activityStart >= todayStart && activityStart <= todayEnd;
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0));
  }, [activities, trip]);

  return (
    <>
      <Heading as="h3" size="4">
        Today's Schedule
      </Heading>
      <Flex gap="2" mb="2" direction="column">
        {todayActivities.length === 0 && (
          <Text size="2">No activities scheduled for today</Text>
        )}
        {todayActivities.map((activity) => {
          const activityStartDateTime =
            activity && activity.timestampStart != null
              ? DateTime.fromMillis(activity.timestampStart).setZone(
                  trip?.timeZone || 'UTC',
                )
              : undefined;
          const activityEndDateTime =
            activity && activity.timestampEnd != null
              ? DateTime.fromMillis(activity.timestampEnd).setZone(
                  trip?.timeZone || 'UTC',
                )
              : undefined;
          const activityStartStr = activityStartDateTime
            ? activityStartDateTime.toFormat('HH:mm')
            : undefined;
          const activityEndStr = activityEndDateTime
            ? activityEndDateTime.toFormat('HH:mm')
            : undefined;

          return (
            <Text key={activity.id} size="2">
              {activityStartStr && activityEndStr ? (
                // Both are set
                <>
                  {activityStartStr}
                  &ndash;{activityEndStr}
                </>
              ) : activityStartStr ? (
                // Only start is set
                <>{activityStartStr} &ndash;No end time</>
              ) : activityEndStr ? (
                // Only end is set
                <>No start time&ndash;{activityEndStr}</>
              ) : (
                // Both are not set
                'No time set'
              )}{' '}
              &mdash;{' '}
              <Link
                to={
                  RouteTripListView.asRouteTarget() +
                  RouteTripListViewActivity.asRouteTarget(activity.id)
                }
              >
                {activity.title}
              </Link>
              {activity.locationDestination}
              {activity.location ? (
                <>
                  {' '}
                  (
                  {
                    <Text color="gray">
                      {activity.location}
                      {activity.locationDestination
                        ? ` → ${activity.locationDestination}`
                        : null}
                    </Text>
                  }
                  )
                </>
              ) : null}
            </Text>
          );
        })}
      </Flex>
    </>
  );
}
