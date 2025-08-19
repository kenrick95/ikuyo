import { Button, Dialog, Flex, Skeleton } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { dangerToken } from '../../../common/ui';
import {
  type DialogContentProps,
  DialogMode,
} from '../../../Dialog/DialogRoute';
import { useBoundStore } from '../../../data/store';
import { dbDeleteTask } from '../../../Task/db';
import type { TripSliceTask } from '../../store/types';

export function TaskDialogContentDelete({
  data: task,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceTask>) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);

  const deleteTask = useCallback(() => {
    if (!task) {
      console.error('Task is undefined');
      return;
    }
    void dbDeleteTask(task.id, task.taskListId)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Task "${task.title}" deleted` },
          close: {},
        });
        setLocation('');
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${task.title}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${task.title}"` },
          close: {},
        });
      });
  }, [publishToast, task, setLocation]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Delete Task" />
      <Dialog.Description size="2">
        Are you sure to delete task "
        {task?.title ?? <Skeleton>Task name</Skeleton>}"?
      </Dialog.Description>

      <Flex gap="3" mt="4" justify="end">
        <Button
          variant="soft"
          color="gray"
          onClick={() => {
            setMode(DialogMode.View);
          }}
        >
          Cancel
        </Button>
        <Button variant="solid" color={dangerToken} onClick={deleteTask}>
          Delete
        </Button>
      </Flex>
    </Dialog.Content>
  );
}
