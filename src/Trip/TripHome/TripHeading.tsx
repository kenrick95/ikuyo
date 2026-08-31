import { Pencil2Icon } from '@radix-ui/react-icons';
import { Badge, Button, Flex, Heading } from '@radix-ui/themes';

import { useCallback } from 'react';
import { useBoundStore } from '../../data/store';
import { canModifyTripContent } from '../permissions';
import { useCurrentTrip } from '../store/hooks';
import { TripEditDialog } from '../TripDialog/TripEditDialog';
import { TripStatusBadge } from '../TripStatusBadge';
import { formatTripDateRange } from '../time';

export function TripHeading() {
  const { trip } = useCurrentTrip();

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
  // Dialog handlers
  const pushDialog = useBoundStore((state) => state.pushDialog);
  const openTripEditDialog = useCallback(() => {
    if (trip) {
      pushDialog(TripEditDialog, { trip });
    }
  }, [trip, pushDialog]);

  const userCanModifyTrip = canModifyTripContent(trip);

  return (
    <Flex align="start" gap="1" wrap="wrap">
      <Heading as="h2" size="5">
        {trip?.title}
        <Button
          variant="outline"
          mx="2"
          size="1"
          onClick={openTripEditDialog}
          disabled={!userCanModifyTrip}
        >
          <Pencil2Icon />
          Edit trip
        </Button>
      </Heading>
      <Badge color="blue" size="2">
        {trip ? (
          <>
            {formatTripDateRange(trip)} ({trip.timeZone})
          </>
        ) : null}
      </Badge>
      <TripStatusBadge
        tripStartDateTime={tripStartDateTime}
        tripEndDateTime={tripEndDateTime}
      />
    </Flex>
  );
}
