import {
  CheckCircledIcon,
  CircleIcon,
  ExclamationTriangleIcon,
} from '@radix-ui/react-icons';
import { Badge, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { Link } from 'wouter';
import { RouteTripTaskList } from '../Routes/routes';
import { TaskStatus } from '../Task/TaskStatus';
import type { TripSliceTask, TripSliceTrip } from './store/types';

interface TripPriorityTasksProps {
  trip: TripSliceTrip;
  tasks: TripSliceTask[];
  maxTasks?: number;
}

export function TripPriorityTasks({
  trip,
  tasks,
  maxTasks = 5,
}: TripPriorityTasksProps) {
  const displayTasks = tasks.slice(0, maxTasks);
  const now = DateTime.now().setZone(trip.timeZone);

  if (displayTasks.length === 0) {
    return (
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2" justify="between">
          <Heading as="h3" size="4">
            Tasks
          </Heading>
          <Link to={RouteTripTaskList.asRouteTarget()}>
            <Text size="2" color="blue">
              Create tasks →
            </Text>
          </Link>
        </Flex>
        <Card>
          <Flex gap="3" align="center" p="4">
            <CircleIcon width="24" height="24" color="gray" />
            <Flex direction="column" gap="1">
              <Text weight="medium" color="gray">
                No tasks yet
              </Text>
              <Text size="2" color="gray">
                Create task lists to keep track of things to do
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" gap="2" justify="between">
        <Heading as="h3" size="4">
          Priority Tasks
        </Heading>
        <Link to={RouteTripTaskList.asRouteTarget()}>
          <Text size="2" color="blue">
            View all →
          </Text>
        </Link>
      </Flex>

      <Flex direction="column" gap="2">
        {displayTasks.map((task) => {
          const isOverdue =
            task.dueAt &&
            DateTime.fromMillis(task.dueAt).setZone(trip.timeZone) < now;
          const isDueToday =
            task.dueAt &&
            DateTime.fromMillis(task.dueAt)
              .setZone(trip.timeZone)
              .hasSame(now, 'day');
          const isInProgress = task.status === TaskStatus.InProgress;
          const isCompleted = task.status === TaskStatus.Done;

          let dueDateColor: 'red' | 'orange' | 'blue' | 'gray' = 'gray';
          let dueDateText = '';

          if (task.dueAt) {
            const dueDate = DateTime.fromMillis(task.dueAt).setZone(
              trip.timeZone,
            );
            if (isOverdue) {
              dueDateColor = 'red';
              dueDateText = `Overdue (${dueDate.toFormat('MMM d')})`;
            } else if (isDueToday) {
              dueDateColor = 'orange';
              dueDateText = `Due today (${dueDate.toFormat('HH:mm')})`;
            } else if (dueDate.diff(now, 'days').days <= 1) {
              dueDateColor = 'orange';
              dueDateText = `Due ${dueDate.toFormat('MMM d, HH:mm')}`;
            } else {
              dueDateColor = 'blue';
              dueDateText = `Due ${dueDate.toFormat('MMM d')}`;
            }
          }

          return (
            <Card key={task.id} variant="surface">
              <Flex gap="3" align="start" p="3">
                <Flex align="center" mt="1">
                  {isCompleted ? (
                    <CheckCircledIcon width="20" height="20" color="green" />
                  ) : (
                    <CircleIcon
                      width="20"
                      height="20"
                      color={isInProgress ? 'blue' : 'gray'}
                    />
                  )}
                </Flex>

                <Flex direction="column" gap="2" flexGrow="1">
                  <Text
                    weight="medium"
                    style={{
                      textDecoration: isCompleted ? 'line-through' : 'none',
                      opacity: isCompleted ? 0.7 : 1,
                    }}
                  >
                    {task.title}
                  </Text>

                  <Flex gap="2" align="center">
                    {isInProgress && (
                      <Badge size="1" color="blue">
                        In Progress
                      </Badge>
                    )}

                    {isOverdue && (
                      <Badge size="1" color="red">
                        <ExclamationTriangleIcon width="12" height="12" />
                        Overdue
                      </Badge>
                    )}

                    {task.dueAt && (
                      <Text size="1" color={dueDateColor}>
                        {dueDateText}
                      </Text>
                    )}
                  </Flex>

                  {task.description && (
                    <Text size="2" color="gray" style={{ fontStyle: 'italic' }}>
                      {task.description}
                    </Text>
                  )}
                </Flex>
              </Flex>
            </Card>
          );
        })}
      </Flex>
    </Flex>
  );
}
