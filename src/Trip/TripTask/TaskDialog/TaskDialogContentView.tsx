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
import { useParseTextIntoNodes } from '../../../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../../../Dialog/DialogRoute';
import { getStatusColor, getStatusLabel } from '../../../Task/TaskStatus';
import { TripUserRole } from '../../../User/TripUserRole';
import { useTrip, useTripTaskList } from '../../store/hooks';
import type { TripSliceTask } from '../../store/types';
import { TaskDialogMode } from './TaskDialogMode';

export function TaskDialogContentView({
  data: task,
  setMode,
  dialogContentProps,
  DialogTitleSection,
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

  const taskDueDateTime =
    task && trip && task.dueAt != null
      ? DateTime.fromMillis(task.dueAt).setZone(trip.timeZone)
      : undefined;

  const taskDueDateStr =
    taskDueDateTime && trip
      ? `${taskDueDateTime.toFormat('dd MMMM yyyy HH:mm')} (${trip.timeZone})`
      : undefined;

  const goToEditMode = useCallback(() => {
    setMode(TaskDialogMode.Edit);
  }, [setMode]);

  const goToDeleteMode = useCallback(() => {
    setMode(TaskDialogMode.Delete);
  }, [setMode]);

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
              <Text>{descriptions}</Text>
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
          {/* Note: Tasks might not have comment groups implemented yet.
              This section may need to be commented out or adjusted based on 
              whether tasks support comments in your implementation. */}
          {task && (
            <Text color="gray" size="2">
              Comments for tasks are not yet implemented.
            </Text>
          )}
        </Flex>
      </Flex>
    </Dialog.Content>
  );
}
