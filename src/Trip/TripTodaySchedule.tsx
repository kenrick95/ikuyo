import { CalendarIcon, ClockIcon } from '@radix-ui/react-icons';
import { Badge, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { Link } from 'wouter';
import { RouteTripListView, RouteTripListViewActivity } from '../Routes/routes';
import type { TripSliceActivityWithTime, TripSliceTrip } from './store/types';

interface TripTodayScheduleProps {
  trip: TripSliceTrip;
  todayActivities: TripSliceActivityWithTime[];
}

export function TripTodaySchedule({
  trip,
  todayActivities,
}: TripTodayScheduleProps) {
  const now = DateTime.now().setZone(trip.timeZone);
  const todayDateStr = now.toFormat('cccc, MMMM d');

  if (todayActivities.length === 0) {
    return (
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <CalendarIcon />
          <Heading as="h3" size="4">
            Today's Schedule
          </Heading>
          <Badge variant="soft" color="blue">
            {todayDateStr}
          </Badge>
        </Flex>
        <Card>
          <Flex gap="3" align="center" p="4">
            <ClockIcon width="24" height="24" color="gray" />
            <Flex direction="column" gap="1">
              <Text weight="medium" color="gray">
                No activities scheduled for today
              </Text>
              <Text size="2" color="gray">
                Enjoy a free day or add some activities to your itinerary
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="2">
        <CalendarIcon />
        <Heading as="h3" size="4">
          Today's Schedule
        </Heading>
        <Badge variant="soft" color="blue">
          {todayDateStr}
        </Badge>
      </Flex>

      <Flex direction="column" gap="2">
        {todayActivities.map((activity, index) => {
          const activityStart = DateTime.fromMillis(
            activity.timestampStart,
          ).setZone(trip.timeZone);
          const activityEnd = DateTime.fromMillis(
            activity.timestampEnd,
          ).setZone(trip.timeZone);

          const startTime = activityStart.toFormat('HH:mm');
          const endTime = activityEnd.toFormat('HH:mm');
          const isCurrentActivity = now >= activityStart && now <= activityEnd;
          const isPast = activityEnd < now;

          return (
            <Card
              key={activity.id}
              variant={isCurrentActivity ? 'classic' : 'surface'}
            >
              <Flex gap="3" align="start" p="3">
                <Flex
                  direction="column"
                  align="center"
                  style={{ minWidth: '60px' }}
                >
                  <Text size="2" weight="bold">
                    {startTime}
                  </Text>
                  <Text size="1" color="gray">
                    {endTime}
                  </Text>
                  {isCurrentActivity && (
                    <Badge size="1" color="green" mt="1">
                      Now
                    </Badge>
                  )}
                  {isPast && (
                    <Badge size="1" color="gray" mt="1">
                      Done
                    </Badge>
                  )}
                </Flex>

                <Flex direction="column" gap="2" flexGrow="1">
                  <Link
                    to={
                      RouteTripListView.asRouteTarget() +
                      RouteTripListViewActivity.asRouteTarget(activity.id)
                    }
                  >
                    <Text
                      weight="medium"
                      style={{
                        textDecoration: isPast ? 'line-through' : 'none',
                        opacity: isPast ? 0.7 : 1,
                      }}
                    >
                      {activity.title}
                    </Text>
                  </Link>

                  {activity.location && (
                    <Text size="2" color="gray">
                      📍 {activity.location}
                      {activity.locationDestination && (
                        <> → {activity.locationDestination}</>
                      )}
                    </Text>
                  )}

                  {activity.description && (
                    <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>
                      {activity.description}
                    </Text>
                  )}
                </Flex>

                {index < todayActivities.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '42px',
                      bottom: '-8px',
                      width: '2px',
                      height: '16px',
                      backgroundColor: 'var(--gray-6)',
                    }}
                  />
                )}
              </Flex>
            </Card>
          );
        })}
      </Flex>
    </Flex>
  );
}
