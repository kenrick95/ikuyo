import { Badge } from '@radix-ui/themes';
import { useMemo } from 'react';
import { getTripStatus } from './getTripStatus';

export function TripStatusBadge({
  tripStartDateTime,
  tripEndDateTime,
}: {
  tripStartDateTime: Temporal.ZonedDateTime | undefined;
  tripEndDateTime: Temporal.ZonedDateTime | undefined;
}) {
  const tripStatus = useMemo(
    () => getTripStatus(tripStartDateTime, tripEndDateTime),
    [tripStartDateTime, tripEndDateTime],
  );

  return tripStatus ? (
    <Badge color={tripStatus.color} size="2">
      {tripStatus.text}
    </Badge>
  ) : null;
}
