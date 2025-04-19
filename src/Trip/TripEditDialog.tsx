import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { CommonDialogMaxWidth } from '../dialog';
import { TripForm } from './TripForm';
import { TripFormMode } from './TripFormMode';
import type { DbTripWithActivity } from './db';
import { formatToDateInput } from './time';

export function TripEditDialog({
  trip,
  dialogOpen,
  setDialogOpen,
}: {
  trip: DbTripWithActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const tripStartStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
  );
  const tripEndStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampEnd)
      .setZone(trip.timeZone)
      .minus({ days: 1 }),
  );
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
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
          tripCurrency={trip.currency}
          tripOriginCurrency={trip.originCurrency}
          activities={trip.activity}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
