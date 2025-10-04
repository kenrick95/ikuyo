import {
  Badge,
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { CommentGroupWithForm } from '../../../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../../../Comment/db';
import { useParseTextIntoNodes } from '../../../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../../../Dialog/DialogRoute';
import { useDeepBoundStore } from '../../../data/store';
import { getStatusColor, getStatusLabel } from '../../../Task/TaskStatus';
import { TripUserRole } from '../../../User/TripUserRole';
import { useTrip, useTripTaskList } from '../../store/hooks';
import type { TripSliceTask } from '../../store/types';
import s from './TaskDialog.module.css';
import { TaskDialogMode } from './TaskDialogMode';

export function TaskDialogContentView({
  data: task,
  setMode,
  dialogContentProps,
  setDialogClosable,
  DialogTitleSection,
  loading,
}: DialogContentProps<TripSliceTask>) {
  const taskList = useTripTaskList(task?.taskListId ?? '');
  const { trip } = useTrip(taskList?.tripId);
  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  const descriptions = useParseTextIntoNodes(task?.description);
  const currentUser = useDeepBoundStore((state) => state.currentUser);

  const taskDueDateTime =
    task && trip && task.dueAt != null
      ? DateTime.fromMillis(task.dueAt).setZone(trip.timeZone)
      : undefined;

  const taskDueDateStr =
    taskDueDateTime && trip
      ? `${taskDueDateTime.toFormat('d MMMM yyyy HH:mm')} (${trip.timeZone})`
      : undefined;

  const goToEditMode = useCallback(() => {
    setMode(TaskDialogMode.Edit);
  }, [setMode]);

  const goToDeleteMode = useCallback(() => {
    setMode(TaskDialogMode.Delete);
  }, [setMode]);
  const setDialogUnclosable = useCallback(() => {
    setDialogClosable(false);
  }, [setDialogClosable]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection
        title={<>Task: {task?.title ?? <Skeleton>Task Title</Skeleton>}</>}
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

          <Dialog.Description size="2">Task details</Dialog.Description>

          <Heading as="h2" size="4">
            Title
          </Heading>
          <Text>{task?.title ?? <Skeleton>Task Title</Skeleton>}</Text>

          <Heading as="h2" size="4">
            Status
          </Heading>
          <div>
            {task ? (
              <Badge color={getStatusColor(task.status)}>
                {getStatusLabel(task.status)}
              </Badge>
            ) : (
              <Skeleton>To Do</Skeleton>
            )}
          </div>

          {taskDueDateStr && (
            <>
              <Heading as="h2" size="4">
                Due Date
              </Heading>
              <Text>{taskDueDateStr}</Text>
            </>
          )}

          {task?.description ? (
            <>
              <Heading as="h2" size="4">
                Description
              </Heading>
              <Text className={s.description}>{descriptions}</Text>
            </>
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
            tripId={task?.tripId}
            objectId={task?.id}
            objectType={COMMENT_GROUP_OBJECT_TYPE.TASK}
            user={currentUser}
            onFormFocus={setDialogUnclosable}
            commentGroupId={task?.commentGroupId}
            isLoading={loading}
          />
        </Flex>
      </Flex>
    </Dialog.Content>
  );
}
