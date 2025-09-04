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
import { dbAddTask } from '../../../Task/db';
import { TaskStatus } from '../../../Task/TaskStatus';

export function TaskInlineForm({
  taskListId,
  tripTimeZone,
  onFormSuccess,
  onFormCancel,
}: {
  taskListId: string;
  tripTimeZone: string;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idDescription = useId();
  const idDueAt = useId();

  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: TaskStatus.Todo,
    dueAt: '',
  });

  const handleInputChange = useCallback(
    (field: string, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errorMessage) {
        setErrorMessage('');
      }
    },
    [errorMessage],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage('');

      const { title, description, status, dueAt } = formData;

      if (!title.trim()) {
        setErrorMessage('Title is required');
        setIsSubmitting(false);
        return;
      }

      const dueAtTimestamp = dueAt
        ? DateTime.fromISO(dueAt, { zone: tripTimeZone }).toMillis()
        : null;

      try {
        const newTaskData = {
          title: title.trim(),
          description: description.trim(),
          status: Number(status),
          index: -Date.now(), // Show at the top
          dueAt: dueAtTimestamp,
        };

        await dbAddTask(newTaskData, { taskListId });

        publishToast({
          root: {},
          title: { children: `Task "${title}" added` },
          close: {},
        });

        // Reset form
        setFormData({
          title: '',
          description: '',
          status: TaskStatus.Todo,
          dueAt: '',
        });

        onFormSuccess();
      } catch (error) {
        console.error('Error adding task:', error);
        setErrorMessage('Failed to add task. Please try again.');
        publishToast({
          root: {},
          title: { children: 'Error adding task' },
          close: {},
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, taskListId, tripTimeZone, publishToast, onFormSuccess],
  );

  return (
    <form
      id={idForm}
      onSubmit={handleSubmit}
      style={{
        padding: '12px',
        border: '1px solid var(--gray-6)',
        borderRadius: '6px',
        backgroundColor: 'var(--gray-1)',
        marginBottom: '12px',
      }}
    >
      <Flex direction="column" gap="3">
        <TextField.Root
          id={idTitle}
          placeholder="Task title..."
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          required
          disabled={isSubmitting}
        />

        <TextArea
          id={idDescription}
          placeholder="Description (optional)..."
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          rows={2}
          disabled={isSubmitting}
        />

        <Flex gap="3" align="end">
          <Flex direction="column" flexGrow="1">
            <Text size="1" weight="medium" mb="1">
              Status
            </Text>
            <Select.Root
              value={formData.status.toString()}
              onValueChange={(value) =>
                handleInputChange('status', Number(value))
              }
              disabled={isSubmitting}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value={TaskStatus.Todo.toString()}>
                  To Do
                </Select.Item>
                <Select.Item value={TaskStatus.InProgress.toString()}>
                  In Progress
                </Select.Item>
                <Select.Item value={TaskStatus.Done.toString()}>
                  Done
                </Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" flexGrow="1">
            <Text size="1" weight="medium" mb="1">
              Due Date (optional)
            </Text>
            <TextField.Root
              id={idDueAt}
              type="datetime-local"
              value={formData.dueAt}
              onChange={(e) => handleInputChange('dueAt', e.target.value)}
              disabled={isSubmitting}
            />
          </Flex>
        </Flex>

        {errorMessage && (
          <Text color="red" size="2">
            {errorMessage}
          </Text>
        )}

        <Flex gap="2" justify="end">
          <Button
            type="button"
            variant="soft"
            color="gray"
            size="2"
            onClick={onFormCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="solid"
            size="2"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
