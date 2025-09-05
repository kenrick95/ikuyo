import { Pencil2Icon, Share1Icon } from '@radix-ui/react-icons';
import {
  Button,
  Container,
  DataList,
  Flex,
  Heading,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { Link } from 'wouter';
import { Comment } from '../Comment/Comment';
import { REGIONS_MAP, type RegionCode } from '../data/intl/regions';
import { useBoundStore } from '../data/store';
import { TripMap } from '../Map/TripMap';
import { RouteTripComment, RouteTripTaskList } from '../Routes/routes';
import { TaskStatus } from '../Task/TaskStatus';
import { TripUserRole } from '../User/TripUserRole';
import {
  useCurrentTrip,
  useTripAllCommentsWithLimit,
  useTripAllTaskLists,
  useTripTasks,
} from './store/hooks';
import { TripEditDialog } from './TripDialog/TripEditDialog';
import { TripSharingDialog } from './TripDialog/TripSharingDialog';
import { TripStatusBadge } from './TripStatusBadge';
import { TaskCard, TaskCardUseCase } from './TripTask/TaskCard';
import { formatTripDateRange } from './time';

const containerPx = { initial: '1', md: '0' };
const containerPb = { initial: '9', sm: '5' };
export function TripHome() {
  const { trip } = useCurrentTrip();

  const tripStartDateTime = trip
    ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
    : undefined;
  const tripEndDateTime = trip
    ? DateTime.fromMillis(trip.timestampEnd).setZone(trip.timeZone)
    : undefined;
  const tripDuration =
    tripEndDateTime && tripStartDateTime
      ? tripEndDateTime.diff(tripStartDateTime, 'days')
      : undefined;

  const latestComments = useTripAllCommentsWithLimit(trip?.id, 5);

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

  const pushDialog = useBoundStore((state) => state.pushDialog);
  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);
  const userIsOwner = useMemo(() => {
    return trip?.currentUserRole === TripUserRole.Owner;
  }, [trip?.currentUserRole]);
  const openTripEditDialog = useCallback(() => {
    if (trip) {
      pushDialog(TripEditDialog, { trip });
    }
  }, [trip, pushDialog]);
  const openTripSharingDialog = useCallback(() => {
    if (trip && userIsOwner) {
      pushDialog(TripSharingDialog, { tripId: trip.id });
    }
  }, [trip, userIsOwner, pushDialog]);

  return (
    <Container mt="2" pb={containerPb} px={containerPx}>
      <Heading as="h2" size="5" mb="2">
        {trip?.title}
        <Button
          variant="outline"
          mx="2"
          size="1"
          onClick={openTripEditDialog}
          disabled={!userCanModifyTrip}
        >
          <Pencil2Icon />
          Edit trip
        </Button>
      </Heading>
      <Text as="p" size="2" mb="2">
        {trip ? (
          <>
            {formatTripDateRange(trip)} ({trip.timeZone})
          </>
        ) : null}
      </Text>
      <Flex gap="2" mb="4" align="start">
        <TripStatusBadge
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
        />
      </Flex>

      <Flex
        gap="1"
        justify="between"
        direction={{ initial: 'column', sm: 'row' }}
      >
        <Flex
          direction="column"
          gap="2"
          flexGrow="1"
          maxWidth={{ initial: '100%', sm: '50%' }}
        >
          <Heading as="h3" size="3" mb="2">
            Details
          </Heading>
          <DataList.Root size="2" mb="4">
            <DataList.Item>
              <DataList.Label>Destination's region</DataList.Label>
              <DataList.Value>
                {trip?.region ? REGIONS_MAP[trip.region as RegionCode] : null}
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Destination's currency</DataList.Label>
              <DataList.Value>{trip?.currency}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Origin's currency</DataList.Label>
              <DataList.Value>{trip?.originCurrency}</DataList.Value>
            </DataList.Item>
          </DataList.Root>
          <Heading as="h3" size="3" mb="2">
            Statistics
          </Heading>
          <DataList.Root size="2" mb="4">
            <DataList.Item>
              <DataList.Label>Days</DataList.Label>
              <DataList.Value>{tripDuration?.days}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Activities</DataList.Label>
              <DataList.Value>{trip?.activityIds.length}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Day plans</DataList.Label>
              <DataList.Value>{trip?.macroplanIds.length}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Accommodations</DataList.Label>
              <DataList.Value>{trip?.accommodationIds?.length}</DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label>Participants</DataList.Label>
              <DataList.Value>
                {trip?.tripUserIds?.length}
                <Button
                  variant="outline"
                  mx="2"
                  size="1"
                  onClick={openTripSharingDialog}
                  disabled={!userIsOwner}
                >
                  <Share1Icon />
                  Share trip
                </Button>
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>
        </Flex>
        <Flex
          direction="column"
          gap="2"
          flexGrow="1"
          maxWidth={{ initial: '100%', sm: '50%' }}
          display={{ initial: 'none', sm: 'flex' }}
        >
          <TripMap useCase="home" />
        </Flex>
      </Flex>
      <Flex
        gap="4"
        justify="between"
        direction={{ initial: 'column', md: 'row' }}
      >
        <Flex gap="2" direction="column" flexGrow="1" flexBasis="50%">
          <Heading as="h3" size="4" mb="2" mt="6">
            Priority Tasks
          </Heading>
          <Flex gap="2" direction="column">
            {displayTasks.length === 0 && <Text size="2">No tasks yet</Text>}
            {displayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                userCanEditOrDelete={userCanModifyTrip}
                useCase={TaskCardUseCase.TripHome}
              />
            ))}
            <Text size="1" mt="2">
              <Link to={RouteTripTaskList.asRouteTarget()}>See all tasks</Link>
            </Text>
          </Flex>
        </Flex>
        <Flex gap="2" direction="column" flexGrow="1" flexBasis="50%">
          <Heading as="h3" size="4" mb="2" mt="6">
            Latest Comments
          </Heading>
          <Flex gap="2" direction="column">
            {latestComments.length === 0 && (
              <Text size="2">No comments yet</Text>
            )}
            {latestComments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onFormFocus={() => {}}
                showCommentObjectTarget
                showControls={false}
              />
            ))}
            <Text size="1" ml="7" mt="2">
              <Link to={RouteTripComment.asRouteTarget()}>
                See all comments
              </Link>
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Container>
  );
}
