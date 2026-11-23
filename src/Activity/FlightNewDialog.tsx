import { Box, Dialog } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import {
  type NewItemPrefill,
  newActivityTimes,
} from '../Trip/destinations/newItemTimes';
import { useTripLocalState } from '../Trip/store/hooks';
import type { TripSliceTrip } from '../Trip/store/types';
import { ActivityFormMode } from './ActivityForm/ActivityFormMode';
import { FlightForm } from './FlightForm/FlightForm';

export function FlightNewDialog({
  trip,
  prefillData,
}: {
  trip: TripSliceTrip;
  prefillData?: NewItemPrefill;
}) {
  const localState = useTripLocalState(trip.id);
  const popDialog = useBoundStore((state) => state.popDialog);

  const askToConfirmPopDialog = useBoundStore(
    (state) => state.askToConfirmPopDialog,
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
    activityStartDateTime,
    activityEndDateTime,
    activityStartTimeZone,
    activityEndTimeZone,
    prefilledStart,
    prefilledEnd,
  ] = useMemo(
    () =>
      newActivityTimes(
        trip,
        prefillData,
        localState?.activityTimestampStart,
        2,
        true,
      ),
    [trip, prefillData, localState?.activityTimestampStart],
  );

  return (
    <Dialog.Root open>
      <Dialog.Content
        maxWidth={CommonLargeDialogMaxWidth}
        onEscapeKeyDown={handleFormCancel}
      >
        <Dialog.Title>New Flight</Dialog.Title>
        <Dialog.Description size="2">
          Add a flight to your trip...
        </Dialog.Description>
        <Box height="16px" />
        <FlightForm
          mode={ActivityFormMode.New}
          tripId={trip.id}
          destinationTrip={trip}
          prefilledStart={prefilledStart}
          prefilledEnd={prefilledEnd}
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
          onFormCancel={handleFormCancel}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
