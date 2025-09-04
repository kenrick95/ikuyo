import { Badge, Card, ContextMenu, Flex, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { dangerToken } from '../../common/ui';
import { getStatusColor, getStatusLabel } from '../../Task/TaskStatus';
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

  const taskCardRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();

  // Track if we should restore focus after dialog closes
  const shouldRestoreFocus = useRef(false);

  // Detect when dialog closes and restore focus
  useEffect(() => {
    // If we were in a dialog state and now we're not, restore focus
    if (shouldRestoreFocus.current && location === '/') {
      taskCardRef.current?.focus();
      shouldRestoreFocus.current = false;
    }
  }, [location]);

  const handleClick = useCallback(() => {
    shouldRestoreFocus.current = true;
    openTaskViewDialog();
  }, [openTaskViewDialog]);

  const handleContextMenuView = useCallback(() => {
    shouldRestoreFocus.current = true;
    openTaskViewDialog();
  }, [openTaskViewDialog]);

  const handleContextMenuEdit = useCallback(() => {
    shouldRestoreFocus.current = true;
    openTaskEditDialog();
  }, [openTaskEditDialog]);

  const handleContextMenuDelete = useCallback(() => {
    shouldRestoreFocus.current = true;
    openTaskDeleteDialog();
  }, [openTaskDeleteDialog]);

  const formatDate = useCallback((timestamp?: number | null) => {
    if (!timestamp) return null;
    return DateTime.fromMillis(timestamp).toFormat('d LLLL yyyy HH:mm');
  }, []);

  // Handle keyboard navigation for accessibility
  // Use onKeyDown for Enter to open the dialog
  // Use onKeyUp for Space to open the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // To avoid scrolling for both keys
        e.preventDefault();
        if (e.key === 'Enter') {
          shouldRestoreFocus.current = true;
          openTaskViewDialog();
        }
      }
    },
    [openTaskViewDialog],
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        e.preventDefault();
        shouldRestoreFocus.current = true;
        openTaskViewDialog();
      }
    },
    [openTaskViewDialog],
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Card
          className={style.taskCard}
          ref={taskCardRef}
          onClick={handleClick}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        >
          <Flex direction="column" gap="2" className={style.taskContent}>
            <Text className={style.taskTitle}>{task.title}</Text>
            {task.description && (
              <Text className={style.taskDescription}>{task.description}</Text>
            )}
            <Flex gap="2" className={style.taskMeta}>
              <Badge color={getStatusColor(task.status)}>
                {getStatusLabel(task.status)}
              </Badge>
              {task.dueAt && (
                <Badge color="amber">Due: {formatDate(task.dueAt)}</Badge>
              )}
              {task.completedAt && (
                <Badge color="green">
                  Completed: {formatDate(task.completedAt)}
                </Badge>
              )}
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
