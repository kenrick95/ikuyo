import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceAccommodation } from '../../Trip/store/types';
import { AccommodationForm } from '../AccommodationForm/AccommodationForm';
import { AccommodationFormMode } from '../AccommodationForm/AccommodationFormMode';
import { getAccommodationCardViewTransitionName } from '../viewTransition';
import { AccommodationDialogMode } from './AccommodationDialogMode';

export function AccommodationDialogContentEdit({
  data: accommodation,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceAccommodation>) {
  const { trip } = useTrip(accommodation?.tripId);

  const tripStartDateTime =
    accommodation && trip
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampStart)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
      : undefined;
  const tripEndDateTime =
    accommodation && trip
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
          .subtract({ days: 1 })
      : undefined;
  const accommodationCheckInDateTime =
    accommodation && trip && accommodation.timestampCheckIn != null
      ? Temporal.Instant.fromEpochMilliseconds(accommodation.timestampCheckIn)
          .toZonedDateTimeISO(accommodation.timeZoneCheckIn ?? trip.timeZone)
          .toPlainDateTime()
      : undefined;
  const accommodationCheckOutDateTime =
    accommodation && trip && accommodation.timestampCheckOut != null
      ? Temporal.Instant.fromEpochMilliseconds(accommodation.timestampCheckOut)
          .toZonedDateTimeISO(accommodation.timeZoneCheckOut ?? trip.timeZone)
          .toPlainDateTime()
      : undefined;
  const backToViewMode = useCallback(() => {
    setMode(AccommodationDialogMode.View);
  }, [setMode]);

  return (
    <Dialog.Content
      {...dialogContentProps}
      style={{
        viewTransitionName: getAccommodationCardViewTransitionName(
          accommodation?.id ?? '',
        ),
        viewTransitionClass: 'vt-entity-dialog',
      }}
    >
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
          accommodationCheckInTimeZone={
            accommodation.timeZoneCheckIn ?? trip.timeZone
          }
          accommodationCheckOutTimeZone={
            accommodation.timeZoneCheckOut ?? trip.timeZone
          }
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
