import { Card, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useMemo } from 'react';
import { Link } from 'wouter';
import { UserHandle } from '../common/UserHandle/UserHandle';
import { RouteTrip } from '../Routes/routes';
import { formatTripDateRange } from '../Trip/time';
import type { TripsPublicSliceTrip } from './store';
import s from './TripPublicCard.module.css';

function useTripDayCount({
  timestampStart,
  timestampEnd,
  timeZone,
}: {
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
}) {
  return useMemo(() => {
    const start = Temporal.Instant.fromEpochMilliseconds(timestampStart)
      .toZonedDateTimeISO(timeZone)
      .startOfDay();
    const end = Temporal.Instant.fromEpochMilliseconds(timestampEnd)
      .toZonedDateTimeISO(timeZone)
      .startOfDay();
    return Math.max(
      1,
      Math.round(end.since(start, { largestUnit: 'days' }).days),
    );
  }, [timestampStart, timestampEnd, timeZone]);
}

export function TripPublicCard({
  trip,
  className,
}: {
  trip: TripsPublicSliceTrip;
  className: string;
}) {
  const dayCount = useTripDayCount(trip);

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
              <UserHandle handle={trip.ownerHandle} mode="full" size="1" />
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
