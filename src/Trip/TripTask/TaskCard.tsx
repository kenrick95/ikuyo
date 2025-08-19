import { Badge, Card, ContextMenu, Flex, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { dangerToken } from '../../common/ui';
import type { TripSliceTask } from '../store/types';
import style from './TaskCard.module.css';
import { useTaskDialogHooks } from './TaskDialog/taskDialogHooks';

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

  const formatDate = useCallback((timestamp?: number | null) => {
    if (!timestamp) return null;
    return DateTime.fromMillis(timestamp).toFormat('MMM d');
  }, []);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Card className={style.taskCard} onClick={handleClick}>
          <Flex direction="column" gap="2" className={style.taskContent}>
            <Text className={style.taskTitle}>{task.title}</Text>
            {task.description && (
              <Text className={style.taskDescription}>{task.description}</Text>
            )}
            <Flex gap="2" className={style.taskMeta}>
              {task.dueAt && (
                <Badge color="amber" className={style.dueDate}>
                  Due: {formatDate(task.dueAt)}
                </Badge>
              )}
              {task.completedAt && (
                <Badge color="green" className={style.completedDate}>
                  Completed: {formatDate(task.completedAt)}
                </Badge>
              )}
              {task.status === 0 && !task.completedAt && (
                <Badge color="gray">To Do</Badge>
              )}
              {task.status === 1 && !task.completedAt && (
                <Badge color="blue">In Progress</Badge>
              )}
              {task.status === 2 || task.completedAt ? (
                <Badge color="green">Done</Badge>
              ) : null}
            </Flex>
          </Flex>
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
