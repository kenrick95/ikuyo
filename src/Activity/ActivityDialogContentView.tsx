import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { CommentGroupWithForm } from '../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../Comment/db';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { CommonCommentDialogMaxWidth } from '../Dialog/ui';
import { useDeepBoundStore } from '../data/store';
import { useTrip } from '../Trip/hooks';
import type { TripSliceActivity } from '../Trip/store/types';
import s from './Activity.module.css';
import { ActivityMap } from './ActivityDialogMap';
import { ActivityDialogMode } from './ActivityDialogMode';

export function ActivityDialogContentView({
  data: activity,
  setMode,
  dialogContentProps,
  setDialogClosable,
  DialogTitleSection,
}: DialogContentProps<TripSliceActivity>) {
  const trip = useTrip(activity?.tripId);
  const activityStartStr =
    activity && trip
      ? DateTime.fromMillis(activity.timestampStart)
          .setZone(trip.timeZone)
          .toFormat('dd LLLL yyyy HH:mm')
      : undefined;
  const activityEndStr =
    activity && trip
      ? DateTime.fromMillis(activity.timestampEnd)
          .setZone(trip.timeZone)
          // since 1 activity must be in same day, so might as well just show the time for end
          .toFormat('HH:mm')
      : undefined;
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

  return (
    <Dialog.Content
      {...dialogContentProps}
      maxWidth={CommonCommentDialogMaxWidth}
    >
      <DialogTitleSection title="View Activity" />
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
              onClick={goToEditMode}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              onClick={goToDeleteMode}
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
            {activityStartStr} to {activityEndStr}
          </Text>

          {activity?.location ? (
            <>
              <Heading as="h2" size="4">
                Location
              </Heading>
              <Text>{activity.location}</Text>
            </>
          ) : (
            <></>
          )}
          {activity?.description ? (
            <>
              <Heading as="h2" size="4">
                Description
              </Heading>
              <Text className={s.activityDescription}>{descriptions}</Text>
            </>
          ) : (
            <></>
          )}

          {activity?.locationLat && activity?.locationLng ? (
            <ActivityMap
              mapOptions={{
                lng: activity.locationLng,
                lat: activity.locationLat,
                zoom: activity.locationZoom ?? 9,
              }}
              marker={{
                lng: activity.locationLng,
                lat: activity.locationLat,
              }}
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
          />
        </Flex>
      </Flex>
    </Dialog.Content>
  );
}
