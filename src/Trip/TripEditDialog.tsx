import { Dialog, Box } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { DbTrip } from '../data/types';
import { TripForm } from './TripForm';
import { TripFormMode } from './TripFormMode';
import { formatToDateInput } from './time';

export function TripEditDialog({
  trip,
  dialogOpen,
  setDialogOpen,
}: {
  trip: DbTrip;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const tripStartStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampStart)
  );
  const tripEndStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampEnd).minus({ days: 1 })
  );
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Edit Trip</Dialog.Title>
        <Dialog.Description>
          Fill in your edited trip details...
        </Dialog.Description>
        <Box height="16px" />
        <TripForm
          tripId={trip.id}
          mode={TripFormMode.Edit}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTitle={trip.title}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          tripTimeZone={trip.timeZone}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}