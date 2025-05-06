import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import type { DbAccommodationWithTrip } from './db';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationDialogContentEdit({
  accommodation,
  setMode,
}: {
  accommodation: DbAccommodationWithTrip;
  setMode: (mode: AccommodationDialogModeType) => void;
}) {
  // TODO: if go to edit mode directly, when saving, we're stuck at edit mode, maybe same issue with the unmount then mount again issue
  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(accommodation.trip.timestampStart).setZone(
      accommodation.trip.timeZone,
    ),
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(accommodation.trip.timestampEnd)
      .setZone(accommodation.trip.timeZone)
      .minus({ minute: 1 }),
  );

  const accommodationCheckInStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(accommodation.timestampCheckIn).setZone(
      accommodation.trip.timeZone,
    ),
  );
  const accommodationCheckOutStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(accommodation.timestampCheckOut).setZone(
      accommodation.trip.timeZone,
    ),
  );
  const backToViewMode = useCallback(() => {
    setMode(AccommodationDialogMode.View);
  }, [setMode]);

  return (
    <Dialog.Content maxWidth={CommonDialogMaxWidth}>
      <Dialog.Title>Edit Accommodation</Dialog.Title>
      <Dialog.Description>
        Fill in the edited accommodation details for this trip...
      </Dialog.Description>
      <Box height="16px" />
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
        onFormCancel={backToViewMode}
        onFormSuccess={backToViewMode}
      />
    </Dialog.Content>
  );
}
