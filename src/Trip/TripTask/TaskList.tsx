import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DotsVerticalIcon,
  Pencil1Icon,
  PlusIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Button,
  DropdownMenu,
  Flex,
  Heading,
  IconButton,
  Text,
  TextField,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShouldDisableDragAndDrop } from '../../common/deviceUtils';
import { dangerToken } from '../../common/ui';
import { useBoundStore } from '../../data/store';
import { dbUpdateTaskList } from '../../Task/db';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip, useTripTaskList, useTripTasks } from '../store/hooks';
import { TaskCard, TaskCardUseCase } from './TaskCard';
import { TaskInlineForm } from './TaskInlineForm/TaskInlineForm';
import taskListStyles from './TaskList.module.css';
import { TaskListDeleteDialog } from './TaskListDeleteDialog';

export function TaskList({
  id,
  isActiveDropZone = false,
}: {
  id: string;
  isActiveDropZone?: boolean;
}) {
  const { trip } = useCurrentTrip();
  const taskList = useTripTaskList(id);
  const tasks = useTripTasks(taskList?.taskIds ?? []);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isDragAndDropDisabled = useShouldDisableDragAndDrop();

  const publishToast = useBoundStore((state) => state.publishToast);
  const pushDialog = useBoundStore((state) => state.pushDialog);

  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  // Focus the input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Make the task list sortable for reordering
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    disabled: !userCanEditOrDelete || isDragAndDropDisabled,
    id: id,
    data: {
      type: 'taskList',
      taskListId: id,
    },
  });

  // Set up droppable area for this task list (for cross-list task drops)
  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `tasklist-${id}`,
    disabled: !userCanEditOrDelete || isDragAndDropDisabled,
    data: {
      type: 'taskList',
      taskListId: id,
    },
  });

  const dragStyle = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Sort tasks by index for proper display order
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.index - b.index);
  }, [tasks]);

  const handleAddTask = useCallback(() => {
    setShowInlineForm(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  const handleFormCancel = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  const handleEditTitle = useCallback(() => {
    if (!taskList) return;
    setEditingTitle(taskList.title);
    setIsEditingTitle(true);
  }, [taskList]);

  const handleSaveTitle = useCallback(async () => {
    if (!taskList) return;

    const trimmedTitle = editingTitle.trim();
    if (!trimmedTitle) {
      publishToast({
        root: {},
        title: { children: 'Title cannot be empty' },
        close: {},
      });
      return;
    }

    if (trimmedTitle === taskList.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await dbUpdateTaskList({
        id: taskList.id,
        title: trimmedTitle,
        index: taskList.index,
        status: taskList.status,
        task: undefined,
      });

      publishToast({
        root: {},
        title: { children: `Task list title updated` },
        close: {},
      });

      setIsEditingTitle(false);
    } catch (error) {
      console.error('Error updating task list title:', error);
      publishToast({
        root: {},
        title: { children: 'Error updating task list title' },
        close: {},
      });
    }
  }, [taskList, editingTitle, publishToast]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingTitle(false);
    setEditingTitle('');
  }, []);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void handleSaveTitle();
      } else if (e.key === 'Escape') {
        handleCancelEdit();
      }
    },
    [handleSaveTitle, handleCancelEdit],
  );

  const handleDeleteTaskList = useCallback(() => {
    if (!taskList) return;
    pushDialog(TaskListDeleteDialog, { taskList });
  }, [taskList, pushDialog]);

  if (!taskList) {
    return null;
  }

  return (
    <div
      className={taskListStyles.taskList}
      style={dragStyle}
      ref={setSortableRef}
      {...attributes}
    >
      <div
        className={taskListStyles.taskListHeader}
        {...listeners}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <Flex justify="between" align="center">
          {isEditingTitle ? (
            <TextField.Root
              ref={titleInputRef}
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleSaveTitle}
              style={{ flex: 1, marginRight: '8px' }}
              size="2"
            />
          ) : (
            <Heading
              as="h3"
              size="4"
              className={taskListStyles.taskListTitle}
              title={taskList.title}
            >
              {taskList.title}
            </Heading>
          )}

          <Flex align="center" gap="2">
            {userCanEditOrDelete && !showInlineForm && !isEditingTitle && (
              <Button size="1" variant="outline" onClick={handleAddTask}>
                <PlusIcon /> Add Task
              </Button>
            )}

            {userCanEditOrDelete && !isEditingTitle && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <IconButton size="1" variant="outline">
                    <DotsVerticalIcon />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item onClick={handleEditTitle}>
                    <Pencil1Icon /> Edit title
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item
                    color={dangerToken}
                    onClick={handleDeleteTaskList}
                  >
                    <TrashIcon /> Delete task list
                  </DropdownMenu.Item>

                  {/* TODO: action to move index up and down */}
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
          </Flex>
        </Flex>
      </div>
      <div
        className={clsx(taskListStyles.taskListContent, {
          [taskListStyles.dropZoneActive]: isActiveDropZone,
        })}
        ref={setDroppableRef}
      >
        {showInlineForm && trip && (
          <TaskInlineForm
            taskListId={id}
            tripTimeZone={trip.timeZone}
            onFormSuccess={handleFormSuccess}
            onFormCancel={handleFormCancel}
          />
        )}
        {sortedTasks.length === 0 && !showInlineForm ? (
          <div className={taskListStyles.emptyState}>
            <Text>No tasks yet</Text>
            {userCanEditOrDelete && !showInlineForm && (
              <Button
                size="2"
                variant="outline"
                style={{ marginTop: '12px' }}
                onClick={handleAddTask}
              >
                <PlusIcon /> Add Task
              </Button>
            )}
          </div>
        ) : (
          <SortableContext
            items={sortedTasks.map((task) => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                userCanEditOrDelete={userCanEditOrDelete}
                useCase={TaskCardUseCase.TripTaskList}
                tripTimeZone={trip?.timeZone}
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
