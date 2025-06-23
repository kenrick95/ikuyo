import { Box, Dialog } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { useTripActivities } from './store/hooks';
import type { TripSliceTrip } from './store/types';
import { TripForm } from './TripForm';
import { TripFormMode } from './TripFormMode';
import { formatToDateInput } from './time';

export function TripEditDialog({ trip }: { trip: TripSliceTrip }) {
  const tripStartStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
  );
  const tripEndStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampEnd)
      .setZone(trip.timeZone)
      .minus({ days: 1 }),
  );
  const popDialog = useBoundStore((state) => state.popDialog);
  const activities = useTripActivities(trip.activityIds);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>Edit Trip</Dialog.Title>
        <Dialog.Description size="2">
          Fill in your edited trip details...
        </Dialog.Description>
        <Box height="16px" />
        <TripForm
          tripId={trip.id}
          mode={TripFormMode.Edit}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTitle={trip.title}
          tripTimeZone={trip.timeZone}
          tripCurrency={trip.currency}
          tripOriginCurrency={trip.originCurrency}
          tripRegions={trip.regions}
          tripSharingLevel={trip.sharingLevel}
          activities={activities}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
