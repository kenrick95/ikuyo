import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceActivity } from '../../Trip/store/types';
import { ActivityForm } from '../ActivityForm/ActivityForm';
import { ActivityFormMode } from '../ActivityForm/ActivityFormMode';
import { formatToDatetimeLocalInput } from '../time';
import { ActivityDialogMode } from './ActivityDialogMode';

export function ActivityDialogContentEdit({
  data: activity,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceActivity>) {
  const { trip } = useTrip(activity?.tripId);

  const tripStartStr =
    activity && trip
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
        )
      : '';
  const tripEndStr =
    activity && trip
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(trip.timestampEnd)
            .setZone(trip.timeZone)
            .minus({ minute: 1 }),
        )
      : '';
  const activityStartStr =
    activity && trip && activity.timestampStart != null
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(activity.timestampStart).setZone(trip.timeZone),
        )
      : '';
  const activityEndStr =
    activity && trip && activity.timestampEnd != null
      ? formatToDatetimeLocalInput(
          DateTime.fromMillis(activity.timestampEnd).setZone(trip.timeZone),
        )
      : '';
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
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          tripTimeZone={trip.timeZone}
          tripRegion={trip.region}
          activityTitle={activity.title}
          activityStartStr={activityStartStr}
          activityEndStr={activityEndStr}
          activityLocationLat={activity.locationLat}
          activityLocationLng={activity.locationLng}
          activityLocationZoom={activity.locationZoom}
          activityLocation={activity.location}
          activityDescription={activity.description}
          activityLocationDestination={activity.locationDestination}
          activityLocationDestinationLat={activity.locationDestinationLat}
          activityLocationDestinationLng={activity.locationDestinationLng}
          activityLocationDestinationZoom={activity.locationDestinationZoom}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
