import {
  Button,
  Flex,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import type { DateTime } from 'luxon';
import { useCallback, useId, useState } from 'react';
import { DateTimePicker } from '../../../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../../../common/DatePicker2/DateTimePickerMode';
import { dangerToken } from '../../../common/ui';
import { useBoundStore } from '../../../data/store';
import { dbAddTask, dbUpdateTask } from '../../../Task/db';
import { TaskStatus } from '../../../Task/TaskStatus';
import { TaskFormMode, type TaskFormModeType } from './TaskFormMode';

export function TaskForm({
  mode,
  taskId,
  taskListId,
  tripTimeZone,
  taskTitle,
  taskDescription,
  taskStatus,
  taskDueAtDateTime,
  taskIndex,
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
  taskDueAtDateTime?: DateTime | null | undefined;
  taskIndex?: number;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idDescription = useId();
  const idStatus = useId();

  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for DateTime picker
  const [dueAtDateTime, setDueAtDateTime] = useState<DateTime | undefined>(
    taskDueAtDateTime || undefined,
  );

  const handleSubmit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage('');

      const formData = new FormData(event.currentTarget);
      const title = (formData.get('title') as string).trim();
      const description = (formData.get('description') as string).trim();
      const status = Number(formData.get('status') as string);

      if (!title) {
        setErrorMessage('Title is required');
        setIsSubmitting(false);
        return;
      }

      const dueAt = dueAtDateTime ? dueAtDateTime.toMillis() : null;

      try {
        if (mode === TaskFormMode.New) {
          // For new tasks, we need to calculate the next index
          // This should ideally come from the parent component or store
          // For now, we'll use Date.now() as a simple ordering mechanism
          const newTaskData = {
            title,
            description,
            status,
            index: -Date.now(), // Simple ordering, show at the top
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
            index: taskIndex ?? -Date.now(),
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
    [
      mode,
      taskId,
      taskListId,
      taskIndex,
      publishToast,
      onFormSuccess,
      dueAtDateTime,
    ],
  );

  return (
    <form id={idForm} onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
        <Text as="label" htmlFor={idTitle} size="2">
          Title
        </Text>
        <TextField.Root
          id={idTitle}
          name="title"
          placeholder="Enter task title..."
          defaultValue={taskTitle}
          required
        />
        <Text as="label" htmlFor={idDescription} size="2">
          Description
        </Text>
        <TextArea
          id={idDescription}
          name="description"
          placeholder="Enter task description..."
          defaultValue={taskDescription}
          rows={4}
        />
        <Text as="label" htmlFor={idStatus} size="2">
          Status
        </Text>
        <Select.Root name="status" defaultValue={taskStatus.toString()}>
          <Select.Trigger id={idStatus} />
          <Select.Content>
            <Select.Item value={TaskStatus.Todo.toString()}>To Do</Select.Item>
            <Select.Item value={TaskStatus.InProgress.toString()}>
              In Progress
            </Select.Item>
            <Select.Item value={TaskStatus.Done.toString()}>Done</Select.Item>
            <Select.Item value={TaskStatus.Cancelled.toString()}>
              Cancelled
            </Select.Item>
          </Select.Content>
        </Select.Root>
        <Text as="label" size="2">
          Due Date <Text size="1">(optional, in {tripTimeZone} time zone)</Text>
        </Text>

        <DateTimePicker
          name="dueAt"
          mode={DateTimePickerMode.DateTime}
          value={dueAtDateTime}
          onChange={setDueAtDateTime}
          clearable
        />

        <Flex gap="3" mt="5" justify="end">
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
