import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip, useTripTaskList, useTripTasks } from '../store/hooks';
import { TaskCard } from './TaskCard';
import { TaskInlineForm } from './TaskInlineForm/TaskInlineForm';
import style from './TaskList.module.css';

export function TaskList({ id }: { id: string }) {
  const { trip } = useCurrentTrip();
  const taskList = useTripTaskList(id);
  const tasks = useTripTasks(taskList?.taskIds ?? []);
  const [showInlineForm, setShowInlineForm] = useState(false);

  // Sort tasks by index for proper display order
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.index - b.index);
  }, [tasks]);

  // Set up droppable area for this task list
  const { setNodeRef, isOver } = useDroppable({
    id: `tasklist-${id}`,
    data: {
      type: 'taskList',
      taskListId: id,
    },
  });

  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  const handleAddTask = useCallback(() => {
    setShowInlineForm(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  const handleFormCancel = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  if (!taskList) {
    return null;
  }

  return (
    <div className={style.taskList}>
      <div className={style.taskListHeader}>
        <Flex justify="between" align="center">
          <Heading as="h3" size="4">
            {taskList.title}
          </Heading>
          {userCanEditOrDelete && !showInlineForm && (
            <Button size="1" variant="outline" onClick={handleAddTask}>
              <PlusIcon /> Add Task
            </Button>
          )}
        </Flex>
      </div>
      <div
        className={clsx(style.taskListContent, {
          [style.dropZoneActive]: isOver,
        })}
        ref={setNodeRef}
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
          <div className={style.emptyState}>
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
              />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}
