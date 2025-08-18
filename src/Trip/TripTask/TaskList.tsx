import { Flex, Heading } from '@radix-ui/themes';
import { useCurrentTrip, useTripTaskList, useTripTasks } from '../store/hooks';
import { TaskCard } from './TaskCard';
import { TripUserRole } from '../../User/TripUserRole';
import { useMemo } from 'react';
import style from './TaskList.module.css';

export function TaskList({ id }: { id: string }) {
  const { trip } = useCurrentTrip();
  const taskList = useTripTaskList(id);
  const tasks = useTripTasks(taskList?.taskIds ?? []);
  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);
  return (
    <Flex direction="column" gap="2">
      <Heading as="h3">{taskList?.title}</Heading>
      <Flex direction="row" gap="2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            userCanEditOrDelete={userCanEditOrDelete}
          />
        ))}
      </Flex>
    </Flex>
  );
}
