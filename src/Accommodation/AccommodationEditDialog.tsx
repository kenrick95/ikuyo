import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { type RouteComponentProps, useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { ROUTES, ROUTES_TRIP, asRootRoute } from '../Routes/routes';
import { db } from '../data/db';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import type { DbAccommodationWithTrip } from './db';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationEditDialog({
  params,
}: RouteComponentProps<{ id: string }>) {
  const { id: accommodationId } = params;
  const [location, setLocation] = useLocation();
  const { isLoading, data } = db.useQuery({
    accommodation: {
      trip: {},
      $: {
        where: {
          id: accommodationId,
        },
      },
    },
  });
  const accommodation = data?.accommodation[0] as
    | DbAccommodationWithTrip
    | undefined;
  const tripStartStr = accommodation
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(accommodation.trip.timestampStart).setZone(
          accommodation.trip.timeZone,
        ),
      )
    : '';
  const tripEndStr = accommodation
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(accommodation.trip.timestampEnd)
          .setZone(accommodation.trip.timeZone)
          .minus({ minute: 1 }),
      )
    : '';

  const accommodationCheckInStr = accommodation
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(accommodation.timestampCheckIn).setZone(
          accommodation.trip.timeZone,
        ),
      )
    : '';
  const accommodationCheckOutStr = accommodation
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(accommodation.timestampCheckOut).setZone(
          accommodation.trip.timeZone,
        ),
      )
    : '';

  const popDialogRoute = useCallback(() => {
    setLocation(
      location.includes(ROUTES_TRIP.ListView)
        ? asRootRoute(
            ROUTES.Trip.asRoute(accommodation.trip.id) + ROUTES_TRIP.ListView,
          )
        : location.includes(ROUTES_TRIP.TimetableView)
          ? asRootRoute(
              ROUTES.Trip.asRoute(accommodation.trip.id) +
                ROUTES_TRIP.TimetableView,
            )
          : asRootRoute(ROUTES.Trip.asRoute(accommodation.trip.id)),
      { replace: true },
    );
  }, [location, setLocation, accommodation]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>Edit Accommodation</Dialog.Title>
        <Dialog.Description>
          Fill in the edited accommodation details for this trip...
        </Dialog.Description>
        <Box height="16px" />
        {isLoading ? 'Loading...' : null}
        {accommodation ? (
          <AccommodationForm
            mode={AccommodationFormMode.Edit}
            tripId={accommodation.trip.id}
            accommodationId={accommodation.id}
            tripTimeZone={accommodation.trip.timeZone}
            tripStartStr={tripStartStr}
            tripEndStr={tripEndStr}
            accommodationName={accommodation.name}
            accommodationAddress={accommodation.address}
            accommodationCheckInStr={accommodationCheckInStr}
            accommodationCheckOutStr={accommodationCheckOutStr}
            accommodationPhoneNumber={accommodation.phoneNumber}
            accommodationNotes={accommodation.notes}
            closeDialogFromCancel={popDialogRoute}
            closeDialogFromSuccess={popDialogRoute}
          />
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}
