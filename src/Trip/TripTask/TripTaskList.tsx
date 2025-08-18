import { Route, Switch } from 'wouter';
import { RouteTripTaskListTask } from '../../Routes/routes';
import { Container, Flex, Heading } from '@radix-ui/themes';
import { TaskDialog } from './TaskDialog/TaskDialog';
import { useCurrentTrip } from '../store/hooks';
import { TaskList } from './TaskList';
import style from './TripTaskList.module.css';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };

export function TripTaskList() {
  const { trip } = useCurrentTrip();

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <Heading as="h2">Task Board</Heading>
      {trip?.taskListIds.map((taskListId) => {
        return (
          <Flex key={taskListId} direction="column" gap="2">
            <TaskList id={taskListId} />
          </Flex>
        );
      })}

      <Switch>
        <Route path={RouteTripTaskListTask.routePath} component={TaskDialog} />
      </Switch>
    </Container>
  );
}
