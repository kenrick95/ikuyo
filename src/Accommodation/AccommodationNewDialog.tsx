import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store';
import { AccommodationForm } from './AccommodationForm';
import { AccommodationFormMode } from './AccommodationFormMode';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationNewDialog({ trip }: { trip: TripSliceTrip }) {
  const popDialog = useBoundStore((state) => state.popDialog);
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

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>New Accommodation</Dialog.Title>
        <Dialog.Description size="2">
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
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
