import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';
import { useBoundStore } from '../../../data/store';
import { dbAddTask } from '../../../Task/db';
import { TaskStatus } from '../../../Task/TaskStatus';
import styles from './TaskInlineForm.module.css';
export function TaskInlineForm({
  taskListId,
  onFormSuccess,
  onFormCancel,
}: {
  taskListId: string;
  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idForm = useId();
  const idTitle = useId();
  const idDescription = useId();

  const titleRef = useRef<HTMLInputElement>(null);

  const publishToast = useBoundStore((state) => state.publishToast);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChange('title', e.target.value);
    },
    [handleInputChange],
  );
  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange('description', e.target.value);
    },
    [handleInputChange],
  );

  const handleSubmit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setErrorMessage('');

      const { title, description } = formData;

      if (!title.trim()) {
        setErrorMessage('Title is required');
        setIsSubmitting(false);
        return;
      }

      try {
        const newTaskData = {
          title: title.trim(),
          description: description.trim(),
          status: TaskStatus.Todo,
          index: -Date.now(), // Show at the top
          dueAt: undefined,
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
        });

        // Focus the title input for adding another task, need setTimeout to ensure it happens after state update
        setTimeout(() => {
          if (titleRef.current) {
            titleRef.current.focus();
          }
        }, 0);

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
    [formData, taskListId, publishToast, onFormSuccess],
  );

  useLayoutEffect(() => {
    // on mount, focus the title input
    if (titleRef.current) {
      titleRef.current.focus();
    }
  }, []);

  return (
    <form id={idForm} onSubmit={handleSubmit} className={styles.form}>
      <Flex direction="column" gap="3">
        <TextField.Root
          id={idTitle}
          placeholder="Task title..."
          value={formData.title}
          onChange={handleTitleChange}
          required
          disabled={isSubmitting}
          ref={titleRef}
        />

        <TextArea
          id={idDescription}
          placeholder="Description (optional)..."
          value={formData.description}
          onChange={handleDescriptionChange}
          rows={2}
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
            {isSubmitting ? 'Adding...' : 'Add Task'}
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
