import { Box, Dialog } from '@radix-ui/themes';
import { CommonLargeDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import type { TripSliceTrip } from '../store/types';
import { TripForm } from '../TripForm';
import { TripFormMode } from '../TripFormMode';

export function TripEditDialog({ trip }: { trip: TripSliceTrip }) {
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
  const popDialog = useBoundStore((state) => state.popDialog);

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
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripTitle={trip.title}
          tripTimeZone={trip.timeZone}
          tripCurrency={trip.currency}
          tripOriginCurrency={trip.originCurrency}
          tripOriginRegion={trip.originRegion}
          tripOriginTimeZone={trip.originTimeZone}
          tripRegion={trip.region}
          tripSharingLevel={trip.sharingLevel}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
