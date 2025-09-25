import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceAccommodation } from '../../Trip/store/types';
import { AccommodationForm } from '../AccommodationForm/AccommodationForm';
import { AccommodationFormMode } from '../AccommodationForm/AccommodationFormMode';
import { AccommodationDialogMode } from './AccommodationDialogMode';

export function AccommodationDialogContentEdit({
  data: accommodation,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceAccommodation>) {
  const { trip } = useTrip(accommodation?.tripId);

  const tripStartDateTime = trip
    ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
    : undefined;
  const tripEndDateTime = trip
    ? DateTime.fromMillis(trip.timestampEnd)
        .setZone(trip.timeZone)
        .minus({ minute: 1 })
    : undefined;

  const accommodationCheckInDateTime =
    accommodation && trip
      ? DateTime.fromMillis(accommodation.timestampCheckIn).setZone(
          trip.timeZone,
        )
      : undefined;
  const accommodationCheckOutDateTime =
    accommodation && trip
      ? DateTime.fromMillis(accommodation.timestampCheckOut).setZone(
          trip.timeZone,
        )
      : undefined;
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
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripRegion={trip.region}
          accommodationName={accommodation.name}
          accommodationAddress={accommodation.address}
          accommodationCheckInDateTime={accommodationCheckInDateTime}
          accommodationCheckOutDateTime={accommodationCheckOutDateTime}
          accommodationPhoneNumber={accommodation.phoneNumber}
          accommodationNotes={accommodation.notes}
          accommodationLocationLat={accommodation.locationLat}
          accommodationLocationLng={accommodation.locationLng}
          accommodationLocationZoom={accommodation.locationZoom}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
