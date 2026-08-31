import { Card, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { Link } from 'wouter';
import { RouteTrip, RouteTripHome } from '../Routes/routes';
import { TripStatusBadge } from '../Trip/TripStatusBadge';
import { formatTripDateRange } from '../Trip/time';
import { getTripCardViewTransitionName } from '../Trip/viewTransition';
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
    ? Temporal.Instant.fromEpochMilliseconds(
        trip.timestampStart,
      ).toZonedDateTimeISO(trip.timeZone)
    : undefined;
  const tripEndDateTime = trip
    ? Temporal.Instant.fromEpochMilliseconds(
        trip.timestampEnd,
      ).toZonedDateTimeISO(trip.timeZone)
    : undefined;
  return (
    <li
      className={clsx(s.tripCard, className)}
      key={trip.id}
      style={{
        viewTransitionName: getTripCardViewTransitionName(trip.id),
        viewTransitionClass: 'vt-trip-card',
      }}
    >
      <Card asChild>
        <Link
          to={`${RouteTrip.asRouteTarget(trip.id)}${RouteTripHome.asRouteTarget()}`}
          className={s.tripCardLink}
        >
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
