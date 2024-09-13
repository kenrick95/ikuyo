import { Dialog, Button, Box } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { DbTrip } from '../data/types';
import { ActivityForm } from './ActivityForm';
import { ActivityFormMode } from './ActivityFormMode';
import { formatToDatetimeLocalInput } from './time';
import style from './Activity.module.css';
import { PlusIcon } from '@radix-ui/react-icons';

export function NewActivityButton({ trip }: { trip: DbTrip }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampStart)
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampEnd)
  );

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger>
        <Button className={style.triggerNewForm}>
          <PlusIcon />
          New activity
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
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
          activityTitle={''}
          activityStartStr={tripStartStr}
          activityEndStr={tripEndStr}
          activityLocation={''}
          activityDescription={''}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
