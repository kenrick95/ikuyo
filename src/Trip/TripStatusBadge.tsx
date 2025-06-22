import { Badge } from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useMemo } from 'react';
import { getTripStatus } from './getTripStatus';

export function TripStatusBadge({
  tripStartDateTime,
  tripEndDateTime,
}: {
  tripStartDateTime: DateTime | undefined;
  tripEndDateTime: DateTime | undefined;
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
