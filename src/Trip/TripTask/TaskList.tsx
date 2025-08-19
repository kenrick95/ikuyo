import { Button, Flex, Heading, Text } from '@radix-ui/themes';
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
            <Button size="1" variant="soft" onClick={handleAddTask}>
              + Add Task
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
        {tasks.length === 0 ? (
          <div className={style.emptyState}>
            <Text>No tasks yet</Text>
            {userCanEditOrDelete && !showInlineForm && (
              <Button
                size="2"
                variant="soft"
                style={{ marginTop: '12px' }}
                onClick={handleAddTask}
              >
                Add Your First Task
              </Button>
            )}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userCanEditOrDelete={userCanEditOrDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
