import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { CommonDialogMaxWidth } from '../dialog';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import type { DbAccommodationWithTrip } from './db';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationEditDialog({
  accommodation,
  dialogOpen,
  setDialogOpen,
}: {
  accommodation: DbAccommodationWithTrip;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
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

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
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
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          tripTimeZone={accommodation.trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          accommodationName={accommodation.name}
          accommodationAddress={accommodation.address}
          accommodationCheckInStr={accommodationCheckInStr}
          accommodationCheckOutStr={accommodationCheckOutStr}
          accommodationPhoneNumber={accommodation.phoneNumber}
          accommodationNotes={accommodation.notes}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
