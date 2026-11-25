import { Box, Dialog } from '@radix-ui/themes';
import { ActivityFlag } from '../../Activity/activityFlag';
import { CommonLargeDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import { useTripActivities, useTripMacroplans } from '../store/hooks';
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
  const activities = useTripActivities(trip.activityIds);
  const plans = useTripMacroplans(trip.macroplanIds);
  const arrivals = activities.flatMap((activity) => {
    if (
      activity.timestampEnd == null ||
      !((activity.flags ?? 0) & (ActivityFlag.IsFlight | ActivityFlag.IsTrain))
    )
      return [];
    const local = Temporal.Instant.fromEpochMilliseconds(
      activity.timestampEnd,
    ).toZonedDateTimeISO(activity.timeZoneEnd ?? trip.timeZone);
    return [
      {
        id: activity.id,
        instant: activity.timestampEnd,
        label: [
          activity.title,
          activity.locationDestination,
          local.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        ]
          .filter(Boolean)
          .join(' · '),
      },
    ];
  });
  const dayPlans = plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    date: Temporal.Instant.fromEpochMilliseconds(plan.timestampStart)
      .toZonedDateTimeISO(plan.timeZoneStart ?? trip.timeZone)
      .toPlainDate()
      .toString(),
  }));
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
          tripDestinations={trip.destinations}
          arrivals={arrivals}
          dayPlans={dayPlans}
          tripSharingLevel={trip.sharingLevel}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
