import { Dialog, Box } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { DbActivityWithTrip } from '../data/types';
import { ActivityForm } from './ActivityForm';
import { ActivityFormMode } from './ActivityFormMode';
import { formatToDatetimeLocalInput } from './time';
import { CommonDialogMaxWidth } from '../dialog';

export function ActivityEditDialog({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivityWithTrip;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.trip.timestampStart).setZone(
      activity.trip.timeZone
    )
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.trip.timestampEnd)
      .setZone(activity.trip.timeZone)
      .minus({ minute: 1 })
  );
  const activityStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.timestampStart).setZone(activity.trip.timeZone)
  );
  const activityEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.timestampEnd).setZone(activity.trip.timeZone)
  );
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>Edit Activity</Dialog.Title>
        <Dialog.Description>
          Fill in your edited activity details...
        </Dialog.Description>
        <Box height="16px" />
        <ActivityForm
          activityId={activity.id}
          mode={ActivityFormMode.Edit}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTimeZone={activity.trip.timeZone}
          activityTitle={activity.title}
          activityStartStr={activityStartStr}
          activityEndStr={activityEndStr}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          activityLocation={activity.location}
          activityDescription={activity.description}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
