import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { AccommodationForm } from './AccommodationForm/AccommodationForm';
import { AccommodationFormMode } from './AccommodationForm/AccommodationFormMode';
import { formatToDatetimeLocalInput } from './time';

export function AccommodationNewDialog({
  trip,
  prefillData,
}: {
  trip: TripSliceTrip;
  prefillData?: {
    dayOfTrip: number;
  };
}) {
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
    if (prefillData) {
      // Calculate the start of the selected day
      const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
        trip.timeZone,
      );
      const selectedDay = tripStart
        .plus({ days: prefillData.dayOfTrip - 1 })
        .startOf('day');

      // Set check-in to 3pm on the selected day
      const checkInTime = selectedDay.set({ hour: 15 });
      // Set check-out to 11am the next day
      const checkOutTime = selectedDay.plus({ days: 1 }).set({ hour: 11 });

      return [
        formatToDatetimeLocalInput(checkInTime),
        formatToDatetimeLocalInput(checkOutTime),
      ];
    }

    // Default behavior when no prefillData
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
  }, [trip, prefillData]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>New Accommodation</Dialog.Title>
        <Dialog.Description size="2">
          Fill in the new accommodation details for this trip...
        </Dialog.Description>
        <Box height="16px" />{' '}
        <AccommodationForm
          mode={AccommodationFormMode.New}
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripRegion={trip.region}
          accommodationName=""
          accommodationAddress=""
          accommodationCheckInStr={accommodationCheckInStr}
          accommodationCheckOutStr={accommodationCheckOutStr}
          accommodationPhoneNumber=""
          accommodationNotes=""
          accommodationLocationLat={undefined}
          accommodationLocationLng={undefined}
          accommodationLocationZoom={undefined}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
