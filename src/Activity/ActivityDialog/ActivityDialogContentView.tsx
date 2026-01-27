import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { CommentGroupWithForm } from '../../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../../Comment/db';
import { useParseTextIntoNodes } from '../../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useDeepBoundStore } from '../../data/store';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceActivity } from '../../Trip/store/types';
import { TripUserRole } from '../../User/TripUserRole';
import { ActivityFlag, hasActivityFlag } from '../activityFlag';
import s from './ActivityDialog.module.css';
import { ActivityMap } from './ActivityDialogMap';
import { ActivityDialogMode } from './ActivityDialogMode';

export function ActivityDialogContentView({
  data: activity,
  setMode,
  dialogContentProps,
  setDialogClosable,
  DialogTitleSection,
  loading,
}: DialogContentProps<TripSliceActivity>) {
  const { trip } = useTrip(activity?.tripId);
  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

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

  const activityTimeStr = useMemo(() => {
    if (activityStartDateTime && activityEndDateTime) {
      if (activityStartDateTime.zoneName === activityEndDateTime.zoneName) {
        // Same timezone, show timezone only once

        if (activityStartDateTime.hasSame(activityEndDateTime, 'day')) {
          // If same day, only show time
          return (
            <>
              {activityStartDateTime.toFormat('d MMMM yyyy')}{' '}
              {activityStartDateTime.toFormat('HH:mm')} &ndash;{' '}
              {activityEndDateTime.toFormat('HH:mm')} (
              {activityStartDateTime.zoneName})
            </>
          );
        }
        return (
          <>
            {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} &ndash;{' '}
            {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityStartDateTime.zoneName})
          </>
        );
      } else {
        // Different timezone, show both
        return (
          <>
            {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityStartDateTime.zoneName}) &ndash;{' '}
            {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
            {activityEndDateTime.zoneName})
          </>
        );
      }
    } else if (activityStartDateTime) {
      // Only start is set
      return (
        <>
          {activityStartDateTime.toFormat('d MMMM yyyy HH:mm')} (
          {activityStartDateTime.zoneName}) &ndash; No end time
        </>
      );
    } else if (activityEndDateTime) {
      // Only end is set
      return (
        <>
          No start time &ndash;{' '}
          {activityEndDateTime.toFormat('d MMMM yyyy HH:mm')} (
          {activityEndDateTime.zoneName})
        </>
      );
    } else {
      return 'No time set';
    }
  }, [activityStartDateTime, activityEndDateTime]);

  const currentUser = useDeepBoundStore((state) => state.currentUser);

  const descriptions = useParseTextIntoNodes(activity?.description);

  const goToEditMode = useCallback(() => {
    setMode(ActivityDialogMode.Edit);
  }, [setMode]);
  const goToDeleteMode = useCallback(() => {
    setMode(ActivityDialogMode.Delete);
  }, [setMode]);
  const setDialogUnclosable = useCallback(() => {
    setDialogClosable(false);
  }, [setDialogClosable]);

  const isIdea = useMemo(() => {
    return hasActivityFlag(activity?.flags, ActivityFlag.IsIdea);
  }, [activity?.flags]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection
        title={
          <>
            Activity{isIdea ? ' Idea' : ''}:{' '}
            {activity?.title ?? <Skeleton>Activity Title</Skeleton>}
          </>
        }
      />
      <Flex
        gap="5"
        justify="between"
        direction={{ initial: 'column', md: 'row' }}
      >
        <Flex
          direction="column"
          gap="3"
          flexGrow="1"
          maxWidth={{ initial: '100%', md: '50%' }}
        >
          <Flex gap="3" mb="3" justify="start">
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              onClick={userCanEditOrDelete ? goToEditMode : undefined}
              disabled={!userCanEditOrDelete}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              onClick={userCanEditOrDelete ? goToDeleteMode : undefined}
              disabled={!userCanEditOrDelete}
            >
              Delete
            </Button>
          </Flex>
          <Dialog.Description size="2">Activity details</Dialog.Description>
          <Heading as="h2" size="4">
            Title
          </Heading>
          <Text>{activity?.title ?? <Skeleton>Activity Title</Skeleton>}</Text>
          <Heading as="h2" size="4">
            Time
          </Heading>
          <Text>
            {activity ? (
              activityTimeStr
            ) : (
              // Loading
              <>
                <Skeleton>1 January 2025 15:00</Skeleton>
                &ndash;<Skeleton>18:00</Skeleton>
              </>
            )}
          </Text>
          {activity?.location ? (
            <>
              <Heading as="h2" size="4">
                {activity?.locationDestination ? 'Origin' : 'Location'}
              </Heading>
              <Text>{activity.location}</Text>
            </>
          ) : null}
          {activity?.locationDestination ? (
            <>
              <Heading as="h2" size="4">
                Destination
              </Heading>
              <Text>{activity.locationDestination}</Text>
            </>
          ) : null}
          {activity?.description ? (
            <>
              <Heading as="h2" size="4">
                Description
              </Heading>
              <Text className={s.description}>{descriptions}</Text>
            </>
          ) : null}
          {activity?.locationLat != null && activity?.locationLng != null ? (
            <ActivityMap
              mapOptions={{
                lng: activity.locationLng,
                lat: activity.locationLat,
                zoom:
                  activity.locationDestinationLng != null &&
                  activity.locationDestinationLat != null
                    ? // If destination is set, use let the map calculate the zoom to fit both; else use user-saved zoom during form new/edit
                      undefined
                    : (activity.locationZoom ?? 9),
              }}
              marker={{
                lng: activity.locationLng,
                lat: activity.locationLat,
              }}
              markerDestination={
                activity.locationDestinationLng != null &&
                activity.locationDestinationLat != null
                  ? {
                      lng: activity.locationDestinationLng,
                      lat: activity.locationDestinationLat,
                    }
                  : undefined
              }
            />
          ) : null}
        </Flex>
        <Flex
          direction="column"
          gap="3"
          flexGrow="1"
          maxWidth={{ initial: '100%', md: '50%' }}
        >
          <Heading as="h2" size="4">
            Comments
          </Heading>
          <CommentGroupWithForm
            tripId={activity?.tripId}
            objectId={activity?.id}
            objectType={COMMENT_GROUP_OBJECT_TYPE.ACTIVITY}
            user={currentUser}
            onFormFocus={setDialogUnclosable}
            commentGroupId={activity?.commentGroupId}
            isLoading={loading}
          />
        </Flex>
      </Flex>
    </Dialog.Content>
  );
}
