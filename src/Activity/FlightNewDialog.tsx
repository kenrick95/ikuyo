import { Box, Dialog } from '@radix-ui/themes';
import { useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { useTripLocalState } from '../Trip/store/hooks';
import type { TripSliceTrip } from '../Trip/store/types';
import { ActivityFormMode } from './ActivityForm/ActivityFormMode';
import { FlightForm } from './FlightForm/FlightForm';

export function FlightNewDialog({
  trip,
  prefillData,
}: {
  trip: TripSliceTrip;
  prefillData?: {
    dayOfTrip: number;
    timeStart: string;
  };
}) {
  const localState = useTripLocalState(trip.id);
  const popDialog = useBoundStore((state) => state.popDialog);

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
    activityStartDateTime,
    activityEndDateTime,
    activityStartTimeZone,
    activityEndTimeZone,
  ] = useMemo(() => {
    if (prefillData) {
      // Convert timeStart (HHMM format) to DateTime
      const hours = parseInt(prefillData.timeStart.substring(0, 2), 10);
      const minutes = parseInt(prefillData.timeStart.substring(2, 4), 10);

      // Calculate the start of the selected day
      const tripStart = Temporal.Instant.fromEpochMilliseconds(
        trip.timestampStart,
      ).toZonedDateTimeISO(trip.timeZone);
      const activityDay = tripStart
        .add({ days: prefillData.dayOfTrip - 1 })
        .startOfDay();

      // Set the specific time on that day
      const activityStartZonedTime = activityDay.with({
        hour: hours,
        minute: minutes,
      });
      const activityEndZonedTime = activityStartZonedTime.add({ hours: 2 });

      return [
        activityStartZonedTime.toPlainDateTime(),
        activityEndZonedTime.toPlainDateTime(),
        activityStartZonedTime.timeZoneId,
        activityEndZonedTime.timeZoneId,
      ];
    }

    // Default behavior when no prefillData
    const activityStartZonedTime = Temporal.Instant.fromEpochMilliseconds(
      localState?.activityTimestampStart ?? trip.timestampStart,
    ).toZonedDateTimeISO(trip.timeZone);
    const activityEndZonedTime = activityStartZonedTime.add({ hours: 2 });

    return [
      activityStartZonedTime.toPlainDateTime(),
      activityEndZonedTime.toPlainDateTime(),
      activityStartZonedTime.timeZoneId,
      activityEndZonedTime.timeZoneId,
    ];
  }, [trip, prefillData, localState?.activityTimestampStart]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>New Flight</Dialog.Title>
        <Dialog.Description size="2">
          Add a flight to your trip...
        </Dialog.Description>
        <Box height="16px" />
        <FlightForm
          mode={ActivityFormMode.New}
          tripId={trip.id}
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripTimeZone={trip.timeZone}
          tripRegion={trip.region}
          activityTitle=""
          activityIcon="✈️"
          activityStartDateTime={activityStartDateTime}
          activityEndDateTime={activityEndDateTime}
          activityStartTimeZone={activityStartTimeZone}
          activityEndTimeZone={activityEndTimeZone}
          activityLocation=""
          activityDescription=""
          activityLocationLat={undefined}
          activityLocationLng={undefined}
          activityLocationZoom={undefined}
          activityLocationDestination={undefined}
          activityLocationDestinationLat={undefined}
          activityLocationDestinationLng={undefined}
          activityLocationDestinationZoom={undefined}
          activityFlags={undefined}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
