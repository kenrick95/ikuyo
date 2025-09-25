import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { AccommodationForm } from './AccommodationForm/AccommodationForm';

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
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd)
    .setZone(trip.timeZone)
    .minus({ minute: 1 });

  const [accommodationCheckInDateTime, accommodationCheckOutDateTime] =
    useMemo(() => {
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

        return [checkInTime, checkOutTime];
      }

      // Default behavior when no prefillData
      return [
        DateTime.fromMillis(trip.timestampStart)
          .setZone(trip.timeZone)
          // Usually check-in is 3pm of the first day
          .plus({ hour: 15 }),
        DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({
            day: 1,
          })
          // Usually check-out is 11am of the last day
          .plus({ hour: 11 }),
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
          mode="new"
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripRegion={trip.region}
          accommodationName=""
          accommodationAddress=""
          accommodationCheckInDateTime={accommodationCheckInDateTime}
          accommodationCheckOutDateTime={accommodationCheckOutDateTime}
          accommodationPhoneNumber=""
          accommodationNotes=""
          accommodationLocationLat={undefined}
          accommodationLocationLng={undefined}
          accommodationLocationZoom={undefined}
          onFormSuccess={() => popDialog()}
          onFormCancel={() => popDialog()}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
