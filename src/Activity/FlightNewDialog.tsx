import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
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

  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd)
    .setZone(trip.timeZone)
    .minus({ minute: 1 });

  const [activityStartDateTime, activityEndDateTime] = useMemo(() => {
    if (prefillData) {
      const hours = parseInt(prefillData.timeStart.substring(0, 2), 10);
      const minutes = parseInt(prefillData.timeStart.substring(2, 4), 10);
      const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
        trip.timeZone,
      );
      const activityDay = tripStart
        .plus({ days: prefillData.dayOfTrip - 1 })
        .startOf('day');
      const activityStartTime = activityDay.set({
        hour: hours,
        minute: minutes,
      });
      const activityEndTime = activityStartTime.plus({ hours: 2 });
      return [activityStartTime, activityEndTime];
    }

    const activityStartTime = DateTime.fromMillis(
      localState?.activityTimestampStart ?? trip.timestampStart,
    ).setZone(trip.timeZone);
    const activityEndTime = activityStartTime.plus({ hours: 2 });
    return [activityStartTime, activityEndTime];
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
