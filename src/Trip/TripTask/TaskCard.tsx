import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Badge, Box, ContextMenu, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useShouldDisableDragAndDrop } from '../../common/deviceUtils';
import { dangerToken } from '../../common/ui';
import { RouteTripTaskList } from '../../Routes/routes';
import { getStatusColor, getStatusLabel } from '../../Task/TaskStatus';
import { useTripTaskList } from '../store/hooks';
import type { TripSliceTask } from '../store/types';
import style from './TaskCard.module.css';
import { useTaskDialogHooks } from './TaskDialog/taskDialogHooks';

export const TaskCardUseCase = {
  TripHome: 'home',
  TripTaskList: 'list',
} as const;

export function TaskCard({
  task,
  userCanEditOrDelete,
  useCase,
  tripTimeZone,
}: {
  task: TripSliceTask;
  userCanEditOrDelete: boolean;
  tripTimeZone: string | undefined;
  useCase: (typeof TaskCardUseCase)[keyof typeof TaskCardUseCase];
}) {
  const isDragAndDropDisabled = useShouldDisableDragAndDrop();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !userCanEditOrDelete || isDragAndDropDisabled,
    data: {
      type: 'task',
      taskListId: task.taskListId,
      task: task,
    },
  });
  const taskList = useTripTaskList(task.taskListId);

  const style_transform = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { openTaskViewDialog, openTaskDeleteDialog, openTaskEditDialog } =
    useTaskDialogHooks(
      task.id,
      // If used on home, need to append '/tasks' in the route
      useCase === TaskCardUseCase.TripHome
        ? RouteTripTaskList.asRouteTarget()
        : '',
    );

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

  const formatDate = useCallback(
    (timestamp?: number | null) => {
      if (!timestamp) return null;
      return DateTime.fromMillis(timestamp, { zone: tripTimeZone }).toFormat(
        'd LLL yyyy HH:mm',
      );
    },
    [tripTimeZone],
  );

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
        <Box
          p={{ initial: '1' }}
          as="div"
          className={clsx(style.taskCard, {
            [style.taskCardDragging]: isDragging,
            [style.draggable]:
              userCanEditOrDelete && TaskCardUseCase.TripTaskList === useCase,
          })}
          ref={(element) => {
            taskCardRef.current = element;
            setNodeRef(element);
          }}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          style={style_transform}
          {...attributes}
          {...(userCanEditOrDelete ? listeners : {})}
        >
          <Flex direction="column" gap="1" className={style.taskContent}>
            <Text className={style.taskTitle} size="1" weight="medium">
              {task.title}
            </Text>
            {task.description && (
              <Text className={style.taskDescription} size="1" weight="light">
                {task.description}
              </Text>
            )}
            <Flex gap="1" className={style.taskMeta}>
              {useCase === 'home' && taskList && (
                <Badge color="gray" className={style.badgeTaskList}>
                  {taskList.title}
                </Badge>
              )}
              <Badge color={getStatusColor(task.status)}>
                {getStatusLabel(task.status)}
                {task.completedAt ? ` at ${formatDate(task.completedAt)}` : ''}
              </Badge>
              {task.dueAt && (
                <Badge color="amber">Due {formatDate(task.dueAt)}</Badge>
              )}
            </Flex>
          </Flex>
        </Box>
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

        {/* TODO: button to move index up and down */}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
