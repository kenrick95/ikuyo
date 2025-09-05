import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { useCallback } from 'react';
import { dangerToken } from '../../common/ui';
import { CommonDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import { dbDeleteTaskList } from '../../Task/db';
import type { TripSliceTaskList } from '../store/types';

export function TaskListDeleteDialog({
  taskList,
}: {
  taskList: TripSliceTaskList;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const popDialog = useBoundStore((state) => state.popDialog);

  const deleteTaskList = useCallback(() => {
    void dbDeleteTaskList(taskList.id)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Task list "${taskList.title}" deleted` },
          close: {},
        });
        popDialog();
      })
      .catch((err: unknown) => {
        console.error(`Error deleting task list "${taskList.title}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting task list "${taskList.title}"` },
          close: {},
        });
        popDialog();
      });
  }, [publishToast, taskList, popDialog]);

  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Content maxWidth={CommonDialogMaxWidth}>
        <AlertDialog.Title>Delete Task List</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <Text as="p">
            Are you sure to delete task list "{taskList.title}"?
          </Text>
          <Text as="p">This will also delete all tasks in this task list.</Text>
          <Text as="p" color={dangerToken}>
            This action is irreversible!
          </Text>
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel onClick={popDialog}>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action onClick={deleteTaskList}>
            <Button variant="solid" color={dangerToken}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
