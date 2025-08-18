import { Card, ContextMenu, Text } from '@radix-ui/themes';
import type { TripSliceTask } from '../store/types';
import { useCallback } from 'react';
import { useTaskDialogHooks } from './TaskDialog/taskDialogHooks';
import { dangerToken } from '../../common/ui';
import style from './TaskCard.module.css';

export function TaskCard({
  task,
  userCanEditOrDelete,
}: {
  task: TripSliceTask;
  userCanEditOrDelete: boolean;
}) {
  const { openTaskViewDialog, openTaskDeleteDialog, openTaskEditDialog } =
    useTaskDialogHooks(task.id);

  const handleClick = useCallback(() => {
    openTaskViewDialog();
  }, [openTaskViewDialog]);

  const handleContextMenuView = useCallback(() => {
    openTaskViewDialog();
  }, [openTaskViewDialog]);

  const handleContextMenuEdit = useCallback(() => {
    openTaskEditDialog();
  }, [openTaskEditDialog]);

  const handleContextMenuDelete = useCallback(() => {
    openTaskDeleteDialog();
  }, [openTaskDeleteDialog]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Card onClick={handleClick}>
          <Text>{task.title}</Text>
          <Text>{task.description}</Text>
          <Text>{task.dueAt}</Text>
          <Text>{task.completedAt}</Text>
        </Card>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{task.title}</ContextMenu.Label>
        <ContextMenu.Item onClick={handleContextMenuView}>
          View
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={userCanEditOrDelete ? handleContextMenuEdit : undefined}
          disabled={!userCanEditOrDelete}
        >
          Edit
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          color={dangerToken}
          onClick={userCanEditOrDelete ? handleContextMenuDelete : undefined}
          disabled={!userCanEditOrDelete}
        >
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
