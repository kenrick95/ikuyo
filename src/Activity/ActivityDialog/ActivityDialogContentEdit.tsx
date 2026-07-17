import { Box, Dialog, RadioCards, Spinner, Text } from '@radix-ui/themes';
import { useCallback, useEffect, useId, useState } from 'react';
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
import { getActivityCardViewTransitionName } from '../viewTransition';
import { ActivityDialogMode } from './ActivityDialogMode';

export function ActivityDialogContentEdit({
  data: activity,
  mode,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceActivity>) {
  const { trip } = useTrip(activity?.tripId);

  const tripStartDateTime =
    activity && trip
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampStart)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
      : undefined;
  const tripEndDateTime =
    activity && trip
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
          .subtract({ days: 1 })
      : undefined;
  const activityStartDateTime =
    activity && trip && activity.timestampStart != null
      ? Temporal.Instant.fromEpochMilliseconds(activity.timestampStart)
          .toZonedDateTimeISO(activity.timeZoneStart ?? trip.timeZone)
          .toPlainDateTime()
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? Temporal.Instant.fromEpochMilliseconds(activity.timestampEnd)
          .toZonedDateTimeISO(activity.timeZoneEnd ?? trip.timeZone)
          .toPlainDateTime()
      : undefined;
  const backToViewMode = useCallback(() => {
    setMode(ActivityDialogMode.View);
  }, [setMode]);

  console.debug('ActivityDialogContentEdit', { activity, trip });

  const [activityType, setActivityType] = useState<ActivityTypeType>(() =>
    getActivityType(activity?.flags),
  );

  // Sync activityType once activity data loads (activity may be undefined on
  // the first render, causing the state to default to Activity incorrectly).
  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-sync only when the identity of the activity changes, not on every mutation
  useEffect(() => {
    if (activity) {
      setActivityType(getActivityType(activity.flags));
    }
  }, [activity?.id]);

  // Reflect the chosen type in the flags so the form saves correctly
  const effectiveFlags = applyActivityType(activity?.flags, activityType);

  const commonFormProps = {
    activityId: activity?.id,
    mode:
      mode === ActivityDialogMode.Duplicate
        ? ActivityFormMode.New
        : ActivityFormMode.Edit,
    tripId: activity?.tripId,
    tripStartDateTime,
    tripEndDateTime,
    tripTimeZone: trip?.timeZone ?? '',
    tripRegion: trip?.region ?? '',
    activityTitle: activity?.title ?? '',
    activityIcon: activity?.icon,
    activityStartDateTime,
    activityEndDateTime,
    activityStartTimeZone: activity?.timeZoneStart ?? trip?.timeZone,
    activityEndTimeZone: activity?.timeZoneEnd ?? trip?.timeZone,
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
    <Dialog.Content
      {...dialogContentProps}
      style={{
        viewTransitionName: getActivityCardViewTransitionName(
          activity?.id ?? '',
        ),
        viewTransitionClass: 'vt-entity-dialog',
      }}
    >
      <DialogTitleSection
        title={`${mode === ActivityDialogMode.Duplicate ? 'Duplicate' : 'Edit'} ${ActivityTypeLabel[activityType]}`}
      />
      <Dialog.Description size="2">
        {activityType === ActivityType.Flight
          ? 'Fill in your edited flight details...'
          : 'Fill in your edited activity details...'}
      </Dialog.Description>
      <Box height="16px" />
      {activity && trip ? (
        <>
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
          {activityType === ActivityType.Flight ? (
            <FlightForm {...commonFormProps} />
          ) : (
            <ActivityForm {...commonFormProps} />
          )}
        </>
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
