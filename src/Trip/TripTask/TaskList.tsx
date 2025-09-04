import type { DragEndEvent } from '@dnd-kit/core';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Flex, Heading, Text } from '@radix-ui/themes';
import { useCallback, useMemo, useState } from 'react';
import { dbUpdateTaskIndexes } from '../../Task/db';
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px threshold to distinguish from clicks
      },
    }),
  );

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

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const activeIndex = sortedTasks.findIndex(
        (task) => task.id === active.id,
      );
      const overIndex = sortedTasks.findIndex((task) => task.id === over.id);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      // Reorder the tasks array
      const reorderedTasks = arrayMove(sortedTasks, activeIndex, overIndex);

      // Update the indexes in the database
      const taskUpdates = reorderedTasks.map((task, index) => ({
        id: task.id,
        index,
      }));

      console.log('Updating task order:', {
        activeIndex,
        overIndex,
        taskUpdates,
      });

      try {
        await dbUpdateTaskIndexes(taskUpdates);
      } catch (error) {
        console.error('Failed to update task order:', error);
      }
    },
    [sortedTasks],
  );

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
      <div className={style.taskListContent}>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
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
          </DndContext>
        )}
      </div>
    </div>
  );
}
