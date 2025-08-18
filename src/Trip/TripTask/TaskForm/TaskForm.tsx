import {
  Button,
  Flex,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useId, useState } from 'react';
import { useBoundStore } from '../../../data/store';
import { dbAddTask, dbUpdateTask } from '../../../Task/db';
import { TaskStatus } from '../../../Task/TaskStatus';
import { TaskFormMode, type TaskFormModeType } from './TaskFormMode';

// Helper functions
const formatToDatetimeLocalInput = (dateTime: DateTime): string => {
  return dateTime.toFormat("yyyy-MM-dd'T'HH:mm");
};

const getTimestampFromDatetimeLocalInput = (
  datetimeLocalStr: string,
  timeZone: string,
): number => {
  if (!datetimeLocalStr) {
    return 0;
  }
  return DateTime.fromISO(datetimeLocalStr, { zone: timeZone }).toMillis();
};

export function TaskForm({
  mode,
  taskId,
  taskListId,
  tripTimeZone,
  taskTitle,
  taskDescription,
  taskStatus,
  taskDueAt,
  onFormSuccess,
  onFormCancel,
}: {
  mode: TaskFormModeType;
  taskId?: string;
  taskListId: string;
  tripTimeZone: string;
  taskTitle: string;
  taskDescription: string;
  taskStatus: number;
  taskDueAt?: number | null | undefined;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idDescription = useId();
  const idStatus = useId();
  const idDueAt = useId();

  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const taskDueDateStr = taskDueAt
    ? formatToDatetimeLocalInput(
        DateTime.fromMillis(taskDueAt).setZone(tripTimeZone),
      )
    : '';

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage('');

      const formData = new FormData(event.currentTarget);
      const title = (formData.get('title') as string).trim();
      const description = (formData.get('description') as string).trim();
      const status = Number(formData.get('status') as string);
      const dueAtStr = formData.get('dueAt') as string;

      if (!title) {
        setErrorMessage('Title is required');
        setIsSubmitting(false);
        return;
      }

      const dueAt = dueAtStr
        ? getTimestampFromDatetimeLocalInput(dueAtStr, tripTimeZone)
        : null;

      try {
        if (mode === TaskFormMode.New) {
          // For new tasks, we need to calculate the next index
          // This should ideally come from the parent component or store
          // For now, we'll use Date.now() as a simple ordering mechanism
          const newTaskData = {
            title,
            description,
            status,
            index: Date.now(), // Simple ordering, could be improved
            dueAt,
          };

          await dbAddTask(newTaskData, { taskListId });
          publishToast({
            root: {},
            title: { children: `Task "${title}" created` },
            close: {},
          });
        } else if (mode === TaskFormMode.Edit && taskId) {
          const updatedTaskData = {
            id: taskId,
            title,
            description,
            status,
            index: Date.now(), // Keep existing index in real implementation
            dueAt,
            completedAt: status === TaskStatus.Done ? Date.now() : null,
          };

          await dbUpdateTask(updatedTaskData);
          publishToast({
            root: {},
            title: { children: `Task "${title}" updated` },
            close: {},
          });
        }

        onFormSuccess();
      } catch (error) {
        console.error('Error saving task:', error);
        setErrorMessage('Failed to save task. Please try again.');
        publishToast({
          root: {},
          title: {
            children: `Error ${mode === TaskFormMode.New ? 'creating' : 'updating'} task`,
          },
          close: {},
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [mode, taskId, taskListId, tripTimeZone, publishToast, onFormSuccess],
  );

  return (
    <form id={idForm} onSubmit={handleSubmit}>
      <Flex direction="column" gap="4">
        <div>
          <Text as="label" htmlFor={idTitle} size="2" weight="bold">
            Title
          </Text>
          <TextField.Root
            id={idTitle}
            name="title"
            placeholder="Enter task title..."
            defaultValue={taskTitle}
            required
          />
        </div>

        <div>
          <Text as="label" htmlFor={idDescription} size="2" weight="bold">
            Description
          </Text>
          <TextArea
            id={idDescription}
            name="description"
            placeholder="Enter task description..."
            defaultValue={taskDescription}
            rows={4}
          />
        </div>

        <div>
          <Text as="label" htmlFor={idStatus} size="2" weight="bold">
            Status
          </Text>
          <Select.Root name="status" defaultValue={taskStatus.toString()}>
            <Select.Trigger id={idStatus} />
            <Select.Content>
              <Select.Item value={TaskStatus.Todo.toString()}>
                To Do
              </Select.Item>
              <Select.Item value={TaskStatus.InProgress.toString()}>
                In Progress
              </Select.Item>
              <Select.Item value={TaskStatus.Done.toString()}>Done</Select.Item>
              <Select.Item value={TaskStatus.Cancelled.toString()}>
                Cancelled
              </Select.Item>
            </Select.Content>
          </Select.Root>
        </div>

        <div>
          <Text as="label" htmlFor={idDueAt} size="2" weight="bold">
            Due Date (optional)
          </Text>
          <TextField.Root
            id={idDueAt}
            name="dueAt"
            type="datetime-local"
            defaultValue={taskDueDateStr}
          />
        </div>

        {errorMessage && (
          <Text color="red" size="2">
            {errorMessage}
          </Text>
        )}

        <Flex gap="3" justify="end">
          <Button
            type="button"
            variant="soft"
            color="gray"
            onClick={onFormCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="solid" disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : mode === TaskFormMode.New
                ? 'Create Task'
                : 'Update Task'}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
