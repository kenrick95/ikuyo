import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';

import { useCallback, useMemo } from 'react';
import { CommentGroupWithForm } from '../../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../../Comment/db';
import { toFormat } from '../../common/dateTime/temporalFormatter';
import { useParseTextIntoNodes } from '../../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useDeepBoundStore } from '../../data/store';
import { canModifyTripContent } from '../../Trip/permissions';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceActivity } from '../../Trip/store/types';
import { getActivityDisplayTitle } from '../activityTitle';
import {
  ActivityType,
  getActivityType,
  getActivityTypeLabel,
} from '../activityType';
import { planningStatusLabel, toPlanningStatus } from '../PlanningStatusSelect';
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
  const userCanEditOrDelete = canModifyTripContent(trip);

  const activityStartDateTime =
    activity && trip && activity.timestampStart != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampStart,
        ).toZonedDateTimeISO(activity.timeZoneStart ?? trip.timeZone)
      : undefined;
  const activityEndDateTime =
    activity && trip && activity.timestampEnd != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampEnd,
        ).toZonedDateTimeISO(activity.timeZoneEnd ?? trip.timeZone)
      : undefined;

  const activityTimeStr = useMemo(() => {
    if (activityStartDateTime && activityEndDateTime) {
      if (activityStartDateTime.timeZoneId === activityEndDateTime.timeZoneId) {
        // Same timezone, show timezone only once
        if (
          activityStartDateTime
            .toPlainDate()
            .equals(activityEndDateTime.toPlainDate())
        ) {
          // If same day, only show time
          return (
            <>
              {toFormat('d MMMM yyyy', activityStartDateTime)}{' '}
              {toFormat('HH:mm', activityStartDateTime)} &ndash;{' '}
              {toFormat('HH:mm', activityEndDateTime)} (
              {activityStartDateTime.timeZoneId})
            </>
          );
        }
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityStartDateTime.timeZoneId})
          </>
        );
      } else {
        // Different timezone, show both
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
            {activityStartDateTime.timeZoneId}) &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityEndDateTime.timeZoneId})
          </>
        );
      }
    } else if (activityStartDateTime) {
      // Only start is set
      return (
        <>
          {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
          {activityStartDateTime.timeZoneId}) &ndash; No end time
        </>
      );
    } else if (activityEndDateTime) {
      // Only end is set
      return (
        <>
          No start time &ndash;{' '}
          {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
          {activityEndDateTime.timeZoneId})
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
  const goToDuplicateMode = useCallback(() => {
    setMode(ActivityDialogMode.Duplicate);
  }, [setMode]);
  const goToDeleteMode = useCallback(() => {
    setMode(ActivityDialogMode.Delete);
  }, [setMode]);
  const setDialogUnclosable = useCallback(() => {
    setDialogClosable(false);
  }, [setDialogClosable]);

  const activityType = useMemo(() => {
    return getActivityType(activity?.flags);
  }, [activity?.flags]);

  const isTransport =
    activityType === ActivityType.Flight || activityType === ActivityType.Train;

  const activityTitle = useMemo(() => {
    if (!activity) {
      return undefined;
    }
    return getActivityDisplayTitle(activity);
  }, [activity]);

  const typeLabel = getActivityTypeLabel(activity?.flags);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection
        title={
          <>
            {typeLabel}: {activityTitle ?? <Skeleton>Activity Title</Skeleton>}
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
              onClick={userCanEditOrDelete ? goToDuplicateMode : undefined}
              disabled={!userCanEditOrDelete}
            >
              Duplicate
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
          <Dialog.Description size="2">
            {isTransport ? 'Transport details' : 'Activity details'}
          </Dialog.Description>
          <Heading as="h2" size="4">
            Title
          </Heading>
          <Text>{activityTitle ?? <Skeleton>Activity Title</Skeleton>}</Text>
          <Heading as="h2" size="4">
            Planning status
          </Heading>
          <Text>
            {activity ? (
              planningStatusLabel[toPlanningStatus(activity.planningStatus)]
            ) : (
              <Skeleton>Planned</Skeleton>
            )}
          </Text>
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
                {isTransport
                  ? 'From'
                  : activity?.locationDestination
                    ? 'Origin'
                    : 'Location'}
              </Heading>
              <Text>{activity.location}</Text>
            </>
          ) : null}
          {activity?.locationDestination ? (
            <>
              <Heading as="h2" size="4">
                {isTransport ? 'To' : 'Destination'}
              </Heading>
              <Text>{activity.locationDestination}</Text>
            </>
          ) : null}
          {activity?.description ? (
            <>
              <Heading as="h2" size="4">
                {isTransport ? 'Notes' : 'Description'}
              </Heading>
              <Text className={s.description}>{descriptions}</Text>
            </>
          ) : null}
          {activity?.locationLat != null && activity?.locationLng != null ? (
            <ActivityMap
              mode="view"
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
