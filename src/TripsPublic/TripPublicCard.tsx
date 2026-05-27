import { Avatar, Card, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { Link } from 'wouter';
import { RouteTrip } from '../Routes/routes';
import { formatTripDateRange } from '../Trip/time';
import type { TripsPublicSliceTrip } from './store';
import s from './TripPublicCard.module.css';

function getTripDayCount(trip: {
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
}): number {
  const start = DateTime.fromMillis(trip.timestampStart, {
    zone: trip.timeZone,
  }).startOf('day');
  const end = DateTime.fromMillis(trip.timestampEnd, {
    zone: trip.timeZone,
  }).startOf('day');
  return Math.max(1, Math.round(end.diff(start, 'days').days));
}

export function TripPublicCard({
  trip,
  className,
}: {
  trip: TripsPublicSliceTrip;
  className: string;
}) {
  const dayCount = getTripDayCount(trip);

  return (
    <li className={clsx(className)}>
      <Card asChild>
        <Link to={RouteTrip.asRouteTarget(trip.id)} className={s.tripCardLink}>
          <Text as="div" weight="bold">
            {trip.title}
          </Text>
          <Text as="div" size="2" color="gray">
            {formatTripDateRange(trip)}
          </Text>
          <Text as="div" size="1" color="gray">
            ({trip.timeZone})
          </Text>
          <div className={s.meta}>
            {trip.ownerHandle ? (
              <Flex align="center" gap="1">
                <Avatar
                  size="1"
                  radius="full"
                  color="gray"
                  variant="soft"
                  fallback={trip.ownerHandle[0].toUpperCase()}
                />
              </Flex>
            ) : null}
            <Text as="span" size="1" color="gray">
              {dayCount} {dayCount === 1 ? 'day' : 'days'}
            </Text>
            <Text as="span" size="1" color="gray">
              {trip.activityCount}{' '}
              {trip.activityCount === 1 ? 'activity' : 'activities'}
            </Text>
          </div>
        </Link>
      </Card>
    </li>
  );
}
