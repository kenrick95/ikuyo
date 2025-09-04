import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
} from '@dnd-kit/sortable';
import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Container, Flex, Heading, Text } from '@radix-ui/themes';
import { useCallback, useMemo, useState } from 'react';
import { Route, Switch } from 'wouter';
import { RouteTripTaskListTask } from '../../Routes/routes';
import {
  dbMoveTaskToTaskList,
  dbUpdateTaskIndexes,
  dbUpdateTaskListIndexes,
} from '../../Task/db';
import { TripUserRole } from '../../User/TripUserRole';
import {
  useCurrentTrip,
  useTripAllTaskLists,
  useTripTasks,
} from '../store/hooks';
import type { TripSliceTask } from '../store/types';
import { TaskCard } from './TaskCard';
import { TaskDialog } from './TaskDialog/TaskDialog';
import { TaskList } from './TaskList';
import { TaskListInlineForm } from './TaskListInlineForm/TaskListInlineForm';
import style from './TripTaskList.module.css';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripTaskList() {
  const { trip } = useCurrentTrip();
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [activeTask, setActiveTask] = useState<TripSliceTask | null>(null);
  const [activeTaskList, setActiveTaskList] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Get all task lists for the current trip
  const allTaskLists = useTripAllTaskLists(trip?.id);

  // Get all task IDs from all task lists
  const allTaskIds = useMemo(() => {
    if (!allTaskLists) return [];
    return allTaskLists.flatMap((taskList) => taskList.taskIds ?? []);
  }, [allTaskLists]);

  const allTasks = useTripTasks(allTaskIds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px threshold to distinguish from clicks
      },
    }),
  );

  const userCanCreate = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  const handleCreateTaskList = useCallback(() => {
    setShowInlineForm(true);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  const handleFormCancel = useCallback(() => {
    setShowInlineForm(false);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;

      // Check if we're dragging a task
      const task = allTasks.find((t: TripSliceTask) => t.id === active.id);
      if (task) {
        setActiveTask(task);
        setActiveTaskList(null);
        setActiveDropZone(null);
        return;
      }

      // Check if we're dragging a task list
      const taskListId = active.id as string;
      if (trip?.taskListIds.includes(taskListId)) {
        setActiveTaskList(taskListId);
        setActiveTask(null);
        setActiveDropZone(null);
      }
    },
    [allTasks, trip?.taskListIds],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setActiveDropZone(null);
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      // If dragging over the same item, do nothing
      if (activeId === overId) {
        setActiveDropZone(null);
        return;
      }

      // Find the active task
      const activeTask = allTasks.find((t: TripSliceTask) => t.id === activeId);
      if (!activeTask) {
        setActiveDropZone(null);
        return;
      }

      // Check what we're dragging over
      if (overId.startsWith('tasklist-')) {
        // Dragging over an empty task list
        const targetTaskListId = overId.replace('tasklist-', '');
        if (activeTask.taskListId !== targetTaskListId) {
          setActiveDropZone(targetTaskListId);
        } else {
          setActiveDropZone(null);
        }
      } else {
        // Dragging over another task
        const overTask = allTasks.find((t: TripSliceTask) => t.id === overId);
        if (overTask && activeTask.taskListId !== overTask.taskListId) {
          // Show drop zone for the task list containing the over task
          setActiveDropZone(overTask.taskListId);
        } else {
          setActiveDropZone(null);
        }
      }
    },
    [allTasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setActiveTaskList(null);
      setActiveDropZone(null);

      if (!over || !trip) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      try {
        // Check if we're dragging a task list
        if (trip.taskListIds.includes(activeId)) {
          // Task list reordering
          if (trip.taskListIds.includes(overId)) {
            console.log('Reordering task lists');

            const activeIndex = trip.taskListIds.indexOf(activeId);
            const overIndex = trip.taskListIds.indexOf(overId);

            if (activeIndex !== -1 && overIndex !== -1) {
              const reorderedTaskListIds = arrayMove(
                trip.taskListIds,
                activeIndex,
                overIndex,
              );

              // Update indexes in database
              const taskListUpdates = reorderedTaskListIds.map((id, index) => ({
                id,
                index,
              }));

              await dbUpdateTaskListIndexes(taskListUpdates);
            }
          }
          return;
        }

        // Handle task dragging (existing logic)
        const activeTask = allTasks.find(
          (t: TripSliceTask) => t.id === activeId,
        );
        if (!activeTask) return;

        // Check if we're dropping over a task list container (empty list)
        if (overId.startsWith('tasklist-')) {
          const targetTaskListId = overId.replace('tasklist-', '');

          // Don't move if it's the same task list
          if (activeTask.taskListId === targetTaskListId) return;

          console.log('Moving task to different empty list:', {
            activeId,
            targetTaskListId,
          });

          // Move task to the new list at the end (high index)
          await dbMoveTaskToTaskList(
            activeId,
            activeTask.taskListId,
            targetTaskListId,
            Date.now(),
          );
        } else {
          // Dropping over another task
          const overTask = allTasks.find((t: TripSliceTask) => t.id === overId);
          if (!overTask) return;

          if (activeTask.taskListId === overTask.taskListId) {
            // Same list - reorder within the list
            console.log('Reordering within same list');

            // Get all tasks in this list and sort them
            const tasksInList = allTasks
              .filter((t) => t.taskListId === activeTask.taskListId)
              .sort((a, b) => a.index - b.index);

            const activeIndex = tasksInList.findIndex((t) => t.id === activeId);
            const overIndex = tasksInList.findIndex((t) => t.id === overId);

            if (activeIndex !== -1 && overIndex !== -1) {
              const reorderedTasks = arrayMove(
                tasksInList,
                activeIndex,
                overIndex,
              );

              // Update indexes for all tasks in the list
              const taskUpdates = reorderedTasks.map((task, index) => ({
                id: task.id,
                index,
              }));

              await dbUpdateTaskIndexes(taskUpdates);
            }
          } else {
            // Different lists - move to the position of the over task
            console.log('Moving to different list at specific position', {
              activeId,
              overTask,
            });
            await dbMoveTaskToTaskList(
              activeId,
              activeTask.taskListId,
              overTask.taskListId,
              overTask.index,
            );

            // Reorder tasks in the target list to make space
            const tasksInTargetList = allTasks
              .filter(
                (t) =>
                  t.taskListId === overTask.taskListId && t.id !== activeId,
              )
              .sort((a, b) => a.index - b.index);

            // Update indexes for tasks that come after the insertion point
            const updatesNeeded = tasksInTargetList
              .filter((t) => t.index >= overTask.index)
              .map((task, i) => ({
                id: task.id,
                index: overTask.index + i + 1,
              }));

            if (updatesNeeded.length > 0) {
              await dbUpdateTaskIndexes(updatesNeeded);
            }
          }
        }
      } catch (error) {
        console.error('Failed to move task or task list:', error);
      }
    },
    [trip, allTasks],
  );

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <div className={style.taskBoardHeader}>
        <Flex justify="between" align="center">
          <Heading as="h2" size="6">
            Task Board
          </Heading>
          {userCanCreate && !showInlineForm && (
            <Button onClick={handleCreateTaskList} variant="outline">
              <PlusIcon /> New Task List
            </Button>
          )}
        </Flex>
      </div>

      {showInlineForm && trip && (
        <TaskListInlineForm
          tripId={trip.id}
          onFormSuccess={handleFormSuccess}
          onFormCancel={handleFormCancel}
        />
      )}

      {trip?.taskListIds.length === 0 || !trip?.taskListIds ? (
        <div className={style.emptyTaskBoard}>
          <Heading as="h3" size="4" color="gray">
            No task lists yet
          </Heading>
          <Text color="gray">
            Organize your trip tasks by creating task lists. You can have
            separate lists for planning, packing, booking, or any other category
            you need.
          </Text>
          {userCanCreate && !showInlineForm && (
            <Button
              size="3"
              style={{ marginTop: '16px' }}
              onClick={handleCreateTaskList}
            >
              Create Your First Task List
            </Button>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={trip.taskListIds}
            strategy={horizontalListSortingStrategy}
          >
            <div className={style.taskBoard}>
              {trip.taskListIds.map((taskListId) => (
                <TaskList
                  key={taskListId}
                  id={taskListId}
                  isActiveDropZone={activeDropZone === taskListId}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200 }}>
            {activeTask ? (
              <TaskCard task={activeTask} userCanEditOrDelete={userCanCreate} />
            ) : activeTaskList ? (
              <TaskList id={activeTaskList} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Switch>
        <Route path={RouteTripTaskListTask.routePath} component={TaskDialog} />
      </Switch>
    </Container>
  );
}
