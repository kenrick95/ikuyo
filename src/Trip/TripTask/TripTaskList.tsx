import { Button, Container, Flex, Heading, Text } from '@radix-ui/themes';
import { useCallback, useMemo, useState } from 'react';
import { Route, Switch } from 'wouter';
import { RouteTripTaskListTask } from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import { useCurrentTrip } from '../store/hooks';
import { TaskDialog } from './TaskDialog/TaskDialog';
import { TaskList } from './TaskList';
import { TaskListInlineForm } from './TaskListInlineForm/TaskListInlineForm';
import style from './TripTaskList.module.css';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripTaskList() {
  const { trip } = useCurrentTrip();
  const [showInlineForm, setShowInlineForm] = useState(false);

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

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <div className={style.taskBoardHeader}>
        <Flex justify="between" align="center">
          <Heading as="h2" size="6">
            Task Board
          </Heading>
          {userCanCreate && !showInlineForm && (
            <Button onClick={handleCreateTaskList}>+ New Task List</Button>
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
        <div className={style.taskBoard}>
          {trip.taskListIds.map((taskListId) => (
            <TaskList key={taskListId} id={taskListId} />
          ))}
        </div>
      )}

      <Switch>
        <Route path={RouteTripTaskListTask.routePath} component={TaskDialog} />
      </Switch>
    </Container>
  );
}
