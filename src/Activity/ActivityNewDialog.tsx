import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { ActivityForm } from './ActivityForm';
import { ActivityFormMode } from './ActivityFormMode';
import { getNewActivityTimestamp } from './activityStorage';
import { formatToDatetimeLocalInput } from './time';

export function ActivityNewDialog({ trip }: { trip: TripSliceTrip }) {
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
  }, [trip]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
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
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
