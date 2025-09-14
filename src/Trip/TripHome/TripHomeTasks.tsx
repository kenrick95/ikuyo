import { Button, Flex, Heading } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Link } from 'wouter';
import { RouteTripTaskList } from '../../Routes/routes';
import { TaskStatus } from '../../Task/TaskStatus';
import { TripUserRole } from '../../User/TripUserRole';
import {
  useCurrentTrip,
  useTripAllTaskLists,
  useTripTasks,
} from '../store/hooks';
import { TaskCard, TaskCardUseCase } from '../TripTask/TaskCard';

export function TripHomeTasks() {
  const { trip } = useCurrentTrip();
  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

  // Get all task lists and tasks
  const allTaskLists = useTripAllTaskLists(trip?.id);
  const allTaskIds = useMemo(() => {
    if (!allTaskLists) return [];
    return allTaskLists.flatMap((taskList) => taskList.taskIds ?? []);
  }, [allTaskLists]);
  const allTasks = useTripTasks(allTaskIds);

  // Filter tasks for display on home page
  const priorityTasks = useMemo(() => {
    if (!allTasks.length || !trip) return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');
    const tomorrowEnd = todayEnd.plus({ days: 1 });

    // First, get priority tasks (in progress, overdue, due today/tomorrow)
    const priorityFiltered = allTasks.filter((task) => {
      // Show in progress tasks
      if (task.status === TaskStatus.InProgress) return true;

      // Show tasks with due dates
      if (task.dueAt) {
        const dueDate = DateTime.fromMillis(task.dueAt).setZone(trip.timeZone);

        // Show past due tasks
        if (dueDate < todayStart) return true;

        // Show tasks due today or tomorrow
        if (dueDate <= tomorrowEnd) return true;
      }

      return false;
    });

    // If we have fewer than 5 priority tasks, fill with other todo tasks
    let result = [...priorityFiltered];
    if (result.length < 5) {
      const otherTasks = allTasks.filter((task) => {
        // Exclude tasks already in priority list
        if (priorityFiltered.some((p) => p.id === task.id)) return false;

        // Only show todo tasks (not completed, cancelled, etc.)
        return task.status === TaskStatus.Todo;
      });

      // Add other tasks to reach 5 total
      const needed = 5 - result.length;
      result = [...result, ...otherTasks.slice(0, needed)];
    }

    // Sort all tasks appropriately
    return result.sort((a, b) => {
      // Sort by due date, then by creation date
      if (a.dueAt && b.dueAt) {
        return a.dueAt - b.dueAt;
      }
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return b.createdAt - a.createdAt;
    });
  }, [allTasks, trip]);

  // Show only first 5 tasks
  const displayTasks = priorityTasks.slice(0, 5);

  return (
    <>
      <Heading as="h3" size="4" mt="1">
        Highlight Tasks{' '}
        {displayTasks.length > 0 ? (
          <Button
            variant="ghost"
            asChild
            size="1"
            ml="2"
            style={{ verticalAlign: 'baseline' }}
          >
            <Link to={RouteTripTaskList.asRouteTarget()}>View all</Link>
          </Button>
        ) : null}
      </Heading>
      <Flex gap="2" direction="column">
        {displayTasks.length === 0 ? (
          <Button variant="outline" asChild style={{ alignSelf: 'start' }}>
            <Link to={RouteTripTaskList.asRouteTarget()}>Add first task</Link>
          </Button>
        ) : null}
        {displayTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            userCanEditOrDelete={userCanModifyTrip}
            useCase={TaskCardUseCase.TripHome}
            tripTimeZone={trip?.timeZone}
          />
        ))}
      </Flex>
    </>
  );
}
