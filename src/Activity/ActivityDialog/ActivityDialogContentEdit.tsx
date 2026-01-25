import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceActivity } from '../../Trip/store/types';
import { ActivityForm } from '../ActivityForm/ActivityForm';
import { ActivityFormMode } from '../ActivityForm/ActivityFormMode';
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

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Edit Activity" />
      <Dialog.Description size="2">
        Fill in your edited activity details...
      </Dialog.Description>
      <Box height="16px" />
      {activity && trip ? (
        <ActivityForm
          activityId={activity.id}
          mode={ActivityFormMode.Edit}
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          tripTimeZone={trip.timeZone}
          tripRegion={trip.region}
          activityTitle={activity.title}
          activityStartDateTime={activityStartDateTime}
          activityEndDateTime={activityEndDateTime}
          activityLocationLat={activity.locationLat}
          activityLocationLng={activity.locationLng}
          activityLocationZoom={activity.locationZoom}
          activityLocation={activity.location}
          activityDescription={activity.description}
          activityLocationDestination={activity.locationDestination}
          activityLocationDestinationLat={activity.locationDestinationLat}
          activityLocationDestinationLng={activity.locationDestinationLng}
          activityLocationDestinationZoom={activity.locationDestinationZoom}
          activityFlags={activity.flags}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
