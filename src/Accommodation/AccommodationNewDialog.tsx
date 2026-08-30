import { Box, Dialog } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { AccommodationForm } from './AccommodationForm/AccommodationForm';
import { AccommodationFormMode } from './AccommodationForm/AccommodationFormMode';
import { getDefaultAccommodationCheckInDate } from './defaultCheckInDate';

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
  const askToConfirmPopDialog = useBoundStore(
    (state) => state.askToConfirmPopDialog,
  );
  const accommodations = useBoundStore((state) =>
    state.getAccommodations(trip.accommodationIds),
  );
  const handleFormCancel = useCallback(() => {
    askToConfirmPopDialog();
  }, [askToConfirmPopDialog]);

  const tripStartDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate();
  const tripEndDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampEnd,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate()
    .subtract({ days: 1 });

  const [
    accommodationCheckInDateTime,
    accommodationCheckOutDateTime,
    accommodationCheckInTimeZone,
    accommodationCheckOutTimeZone,
  ] = useMemo(() => {
    if (prefillData) {
      // Calculate the start of the selected day
      const tripStart = Temporal.Instant.fromEpochMilliseconds(
        trip.timestampStart,
      ).toZonedDateTimeISO(trip.timeZone);
      const selectedDay = tripStart
        .add({ days: prefillData.dayOfTrip - 1 })
        .startOfDay();

      // Set check-in to 3pm on the selected day
      const checkInTime = selectedDay.with({ hour: 15 });
      // Set check-out to 11am the next day
      const checkOutTime = selectedDay.add({ days: 1 }).with({ hour: 11 });

      return [
        checkInTime.toPlainDateTime(),
        checkOutTime.toPlainDateTime(),
        checkInTime.timeZoneId,
        checkOutTime.timeZoneId,
      ];
    }

    const defaultCheckInDate = getDefaultAccommodationCheckInDate(
      trip,
      accommodations,
    );

    // Default behavior when no prefillData
    return [
      defaultCheckInDate
        // Usually check-in is 3pm of the selected day
        .toPlainDateTime({ hour: 15 }),
      Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
        .toZonedDateTimeISO(trip.timeZone)
        .subtract({
          days: 1,
        })
        // Usually check-out is 11am of the last day
        .with({ hour: 11 })
        .toPlainDateTime(),
      trip.timeZone,
      trip.timeZone,
    ];
  }, [trip, accommodations, prefillData]);

  return (
    <Dialog.Root open>
      <Dialog.Content
        maxWidth={CommonLargeDialogMaxWidth}
        onEscapeKeyDown={handleFormCancel}
      >
        <Dialog.Title>New Accommodation</Dialog.Title>
        <Dialog.Description size="2">
          Fill in the new accommodation details for this trip...
        </Dialog.Description>
        <Box height="16px" />{' '}
        <AccommodationForm
          mode={AccommodationFormMode.New}
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripRegion={trip.region}
          accommodationName=""
          accommodationAddress=""
          accommodationCheckInDateTime={accommodationCheckInDateTime}
          accommodationCheckOutDateTime={accommodationCheckOutDateTime}
          accommodationCheckInTimeZone={accommodationCheckInTimeZone}
          accommodationCheckOutTimeZone={accommodationCheckOutTimeZone}
          accommodationPhoneNumber=""
          accommodationNotes=""
          accommodationLocationLat={undefined}
          accommodationLocationLng={undefined}
          accommodationLocationZoom={undefined}
          onFormSuccess={popDialog}
          onFormCancel={handleFormCancel}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
