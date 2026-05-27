import { Box, Dialog, RadioCards, Spinner, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useId, useState } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceActivity } from '../../Trip/store/types';
import { ActivityForm } from '../ActivityForm/ActivityForm';
import { ActivityFormMode } from '../ActivityForm/ActivityFormMode';
import {
  ActivityType,
  ActivityTypeLabel,
  type ActivityTypeType,
  applyActivityType,
  getActivityType,
} from '../activityType';
import { FlightForm } from '../FlightForm/FlightForm';
import { ActivityDialogMode } from './ActivityDialogMode';

export function ActivityDialogContentEdit({
  data: activity,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceActivity>) {
  const { trip } = useTrip(activity?.tripId);

  const tripStartDateTime =
    activity && trip
      ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
      : undefined;
  const tripEndDateTime =
    activity && trip
      ? DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({ minute: 1 })
      : undefined;
  const activityStartDateTime =
    activity && trip && activity.timestampStart != null
      ? DateTime.fromMillis(activity.timestampStart).setZone(
          activity.timeZoneStart ?? trip.timeZone,
        )
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? DateTime.fromMillis(activity.timestampEnd).setZone(
          activity.timeZoneEnd ?? trip.timeZone,
        )
      : undefined;
  const backToViewMode = useCallback(() => {
    setMode(ActivityDialogMode.View);
  }, [setMode]);

  console.debug('ActivityDialogContentEdit', { activity, trip });

  const [activityType, setActivityType] = useState<ActivityTypeType>(() =>
    getActivityType(activity?.flags),
  );

  // Reflect the chosen type in the flags so the form saves correctly
  const effectiveFlags = applyActivityType(activity?.flags, activityType);

  const commonFormProps = {
    activityId: activity?.id,
    mode: ActivityFormMode.Edit,
    tripStartDateTime,
    tripEndDateTime,
    tripTimeZone: trip?.timeZone ?? '',
    tripRegion: trip?.region ?? '',
    activityTitle: activity?.title ?? '',
    activityIcon: activity?.icon,
    activityStartDateTime,
    activityEndDateTime,
    activityLocationLat: activity?.locationLat,
    activityLocationLng: activity?.locationLng,
    activityLocationZoom: activity?.locationZoom,
    activityLocation: activity?.location ?? '',
    activityDescription: activity?.description ?? '',
    activityLocationDestination: activity?.locationDestination,
    activityLocationDestinationLat: activity?.locationDestinationLat,
    activityLocationDestinationLng: activity?.locationDestinationLng,
    activityLocationDestinationZoom: activity?.locationDestinationZoom,
    activityFlags: effectiveFlags,
    onFormCancel: backToViewMode,
    onFormSuccess: backToViewMode,
  };
  const idActivityType = useId();

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title={`Edit ${ActivityTypeLabel[activityType]}`} />
      <Dialog.Description size="2">
        {activityType === ActivityType.Flight
          ? 'Fill in your edited flight details...'
          : 'Fill in your edited activity details...'}
      </Dialog.Description>
      <Box height="16px" />
      <Text as="label" htmlFor={idActivityType} size="2">
        Type
      </Text>
      <RadioCards.Root
        columns="2"
        size="1"
        id={idActivityType}
        value={activityType}
        onValueChange={(v) => setActivityType(v as ActivityTypeType)}
        mb="3"
      >
        {(Object.values(ActivityType) as ActivityTypeType[]).map((type) => (
          <RadioCards.Item key={type} value={type}>
            {ActivityTypeLabel[type]}
          </RadioCards.Item>
        ))}
      </RadioCards.Root>
      <Box height="16px" />
      {activity && trip ? (
        activityType === ActivityType.Flight ? (
          <FlightForm {...commonFormProps} />
        ) : (
          <ActivityForm {...commonFormProps} />
        )
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
