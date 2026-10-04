import { Card, Text } from '@radix-ui/themes';
import { Link } from 'wouter';
import s from '../common/TripCards.module.css';
import { RouteTransition } from '../Routes/RouteTransition';
import { RouteTrip, RouteTripHome } from '../Routes/routes';
import { TripStatusBadge } from '../Trip/TripStatusBadge';
import { formatTripDateRange } from '../Trip/time';
import { getTripCardViewTransitionName } from '../Trip/viewTransition';
import type { TripsSliceTrip } from './store';

export function TripCard({
  trip,
  placeholder = false,
}: {
  trip: TripsSliceTrip;
  placeholder?: boolean;
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
    <RouteTransition
      name={placeholder ? undefined : getTripCardViewTransitionName(trip.id)}
      default="none"
      share={placeholder ? 'none' : 'vt-trip-card'}
    >
      <li className={s.item}>
        <Card asChild>
          <Link
            to={`${RouteTrip.asRouteTarget(trip.id)}${RouteTripHome.asRouteTarget()}`}
            className={s.link}
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
            <div className={s.footer}>
              <TripStatusBadge
                tripStartDateTime={tripStartDateTime}
                tripEndDateTime={tripEndDateTime}
              />
            </div>
          </Link>
        </Card>
      </li>
    </RouteTransition>
  );
}
