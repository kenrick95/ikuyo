import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import type { DbTrip } from '../Trip/db';
import { CommonDialogMaxWidth } from '../dialog';
import { ActivityForm } from './ActivityForm';
import { ActivityFormMode } from './ActivityFormMode';
import { getNewActivityTimestamp } from './activitiyStorage';
import { formatToDatetimeLocalInput } from './time';

export function ActivityNewDialog({
  trip,
  dialogOpen,
  setDialogOpen,
}: {
  trip: DbTrip;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
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
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>New Activity</Dialog.Title>
        <Dialog.Description>
          Fill in your new activity details...
        </Dialog.Description>
        <Box height="16px" />
        <ActivityForm
          mode={ActivityFormMode.New}
          tripId={trip.id}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTimeZone={trip.timeZone}
          activityTitle={''}
          activityStartStr={activityStartStr}
          activityEndStr={activityEndStr}
          activityLocation={''}
          activityDescription={''}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
