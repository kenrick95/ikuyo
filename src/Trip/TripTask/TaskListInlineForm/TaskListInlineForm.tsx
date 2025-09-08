import { Button, Flex, Text, TextField } from '@radix-ui/themes';
import { useCallback, useId, useState } from 'react';
import { useBoundStore } from '../../../data/store';
import { dbAddTaskList } from '../../../Task/db';
import { TaskListStatus } from '../../../Task/TaskListStatus';
import styles from './TaskInlineForm.module.css';

export function TaskListInlineForm({
  tripId,
  onFormSuccess,
  onFormCancel,
}: {
  tripId: string;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();

  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage('');

      const trimmedTitle = title.trim();

      if (!trimmedTitle) {
        setErrorMessage('Title is required');
        setIsSubmitting(false);
        return;
      }

      try {
        const newTaskListData = {
          title: trimmedTitle,
          index: -Date.now(), // First
          status: TaskListStatus.Todo,
        };

        await dbAddTaskList(newTaskListData, { tripId });

        publishToast({
          root: {},
          title: { children: `Task list "${trimmedTitle}" created` },
          close: {},
        });

        // Reset form
        setTitle('');

        onFormSuccess();
      } catch (error) {
        console.error('Error creating task list:', error);
        setErrorMessage('Failed to create task list. Please try again.');
        publishToast({
          root: {},
          title: { children: 'Error creating task list' },
          close: {},
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, tripId, publishToast, onFormSuccess],
  );

  return (
    <form id={idForm} onSubmit={handleSubmit} className={styles.form}>
      <Flex direction="column" gap="3">
        <Text size="3" weight="medium">
          Create New Task List
        </Text>

        <TextField.Root
          id={idTitle}
          placeholder="Task list title (e.g. Planning, Packing, Bookings)..."
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (errorMessage) {
              setErrorMessage('');
            }
          }}
          required
          disabled={isSubmitting}
        />

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
            {isSubmitting ? 'Creating...' : 'Create Task List'}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
