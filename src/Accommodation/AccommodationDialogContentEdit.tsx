import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { useTrip } from '../Trip/hooks';
import type { TripSliceAccommodation } from '../Trip/store/types';
import { AccommodationDialogMode } from './AccommodationDialogMode';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationDialogContentEdit({
  data: accommodation,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceAccommodation>) {
  const trip = useTrip(accommodation?.tripId);

  const tripStartStr = trip
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
      )
    : '';
  const tripEndStr = trip
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({ minute: 1 }),
      )
    : '';

  const accommodationCheckInStr =
    accommodation && trip
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(accommodation.timestampCheckIn).setZone(
            trip.timeZone,
          ),
        )
      : '';
  const accommodationCheckOutStr =
    accommodation && trip
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(accommodation.timestampCheckOut).setZone(
            trip.timeZone,
          ),
        )
      : '';
  const backToViewMode = useCallback(() => {
    setMode(AccommodationDialogMode.View);
  }, [setMode]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Edit Accommodation" />
      <Dialog.Description size="2">
        Fill in the edited accommodation details for this trip...
      </Dialog.Description>
      <Box height="16px" />
      {accommodation && trip ? (
        <AccommodationForm
          mode={AccommodationFormMode.Edit}
          tripId={trip.id}
          accommodationId={accommodation.id}
          tripTimeZone={trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          accommodationName={accommodation.name}
          accommodationAddress={accommodation.address}
          accommodationCheckInStr={accommodationCheckInStr}
          accommodationCheckOutStr={accommodationCheckOutStr}
          accommodationPhoneNumber={accommodation.phoneNumber}
          accommodationNotes={accommodation.notes}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
