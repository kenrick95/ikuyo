import { Card, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { Link } from 'wouter';
import { RouteTrip } from '../Routes/routes';
import { TripStatusBadge } from '../Trip/TripStatusBadge';
import { formatTripDateRange } from '../Trip/time';
import type { TripsSliceTrip } from './store';
import s from './TripCard.module.css';

export function TripCard({
  trip,
  className,
}: {
  trip: TripsSliceTrip;
  className: string;
}) {
  const tripStartDateTime = trip
    ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
    : undefined;
  const tripEndDateTime = trip
    ? DateTime.fromMillis(trip.timestampEnd).setZone(trip.timeZone)
    : undefined;
  return (
    <li className={clsx(s.tripCard, className)} key={trip.id}>
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
          <TripStatusBadge
            tripStartDateTime={tripStartDateTime}
            tripEndDateTime={tripEndDateTime}
          />
        </Link>
      </Card>
    </li>
  );
}
