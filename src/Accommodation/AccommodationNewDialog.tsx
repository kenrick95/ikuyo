import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { ROUTES, ROUTES_TRIP, asRootRoute } from '../Routes/routes';
import type { DbTrip } from '../Trip/db';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationNewDialog({
  trip,
}: {
  trip: DbTrip;
}) {
  const [location, setLocation] = useLocation();

  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampEnd)
      .setZone(trip.timeZone)
      .minus({ minute: 1 }),
  );

  const [accommodationCheckInStr, accommodationCheckOutStr] = useMemo(() => {
    return [
      formatToDatetimeLocalInput(
        DateTime.fromMillis(trip.timestampStart)
          .setZone(trip.timeZone)
          // Usually check-in is 3pm of the first day
          .plus({ hour: 15 }),
      ),
      formatToDatetimeLocalInput(
        DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({
            day: 1,
          })
          // Usually check-out is 11am of the last day
          .plus({ hour: 11 }),
      ),
    ];
  }, [trip]);

  const popDialogRoute = useCallback(() => {
    setLocation(
      location.includes(ROUTES_TRIP.ListView)
        ? asRootRoute(ROUTES.Trip.asRoute(trip.id) + ROUTES_TRIP.ListView)
        : location.includes(ROUTES_TRIP.TimetableView)
          ? asRootRoute(
              ROUTES.Trip.asRoute(trip.id) + ROUTES_TRIP.TimetableView,
            )
          : asRootRoute(ROUTES.Trip.asRoute(trip.id)),
    );
  }, [location, setLocation, trip.id]);

  return (
    <Dialog.Root defaultOpen open>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>New Accommodation</Dialog.Title>
        <Dialog.Description>
          Fill in the new accommodation details for this trip...
        </Dialog.Description>
        <Box height="16px" />
        <AccommodationForm
          mode={AccommodationFormMode.New}
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          accommodationName=""
          accommodationAddress=""
          accommodationCheckInStr={accommodationCheckInStr}
          accommodationCheckOutStr={accommodationCheckOutStr}
          accommodationPhoneNumber=""
          accommodationNotes=""
          closeDialogFromCancel={popDialogRoute}
          closeDialogFromSuccess={popDialogRoute}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
