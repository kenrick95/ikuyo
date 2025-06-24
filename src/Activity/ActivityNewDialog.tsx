import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { ActivityForm } from './ActivityForm/ActivityForm';
import { ActivityFormMode } from './ActivityForm/ActivityFormMode';
import { getNewActivityTimestamp } from './activityStorage';
import { formatToDatetimeLocalInput } from './time';

export function ActivityNewDialog({
  trip,
  prefillData,
}: {
  trip: TripSliceTrip;
  prefillData?: {
    dayOfTrip: number;
    timeStart: string;
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
  const [activityStartStr, activityEndStr] = useMemo(() => {
    if (prefillData) {
      // Convert timeStart (HHMM format) to DateTime
      const hours = parseInt(prefillData.timeStart.substring(0, 2), 10);
      const minutes = parseInt(prefillData.timeStart.substring(2, 4), 10);

      // Calculate the start of the selected day
      const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
        trip.timeZone,
      );
      const activityDay = tripStart
        .plus({ days: prefillData.dayOfTrip - 1 })
        .startOf('day');

      // Set the specific time on that day
      const activityStartTime = activityDay.set({
        hour: hours,
        minute: minutes,
      });
      const activityEndTime = activityStartTime.plus({ hours: 1 });

      return [
        formatToDatetimeLocalInput(activityStartTime),
        formatToDatetimeLocalInput(activityEndTime),
      ];
    }

    // Default behavior when no prefillData
    const activityStartTimestamp = getNewActivityTimestamp(trip);

    return [
      formatToDatetimeLocalInput(
        DateTime.fromMillis(activityStartTimestamp).setZone(trip.timeZone),
      ),
      formatToDatetimeLocalInput(
        DateTime.fromMillis(activityStartTimestamp)
          .setZone(trip.timeZone)
          .plus({
            hours: 1,
          }),
      ),
    ];
  }, [trip, prefillData]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>New Activity</Dialog.Title>
        <Dialog.Description size="2">
          Fill in your new activity details...
        </Dialog.Description>
        <Box height="16px" />
        <ActivityForm
          mode={ActivityFormMode.New}
          tripId={trip.id}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTimeZone={trip.timeZone}
          tripRegion={trip.region}
          activityTitle={''}
          activityStartStr={activityStartStr}
          activityEndStr={activityEndStr}
          activityLocation={''}
          activityDescription={''}
          activityLocationLat={undefined}
          activityLocationLng={undefined}
          activityLocationZoom={undefined}
          activityLocationDestination={undefined}
          activityLocationDestinationLat={undefined}
          activityLocationDestinationLng={undefined}
          activityLocationDestinationZoom={undefined}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
