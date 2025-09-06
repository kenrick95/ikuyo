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
import { Activity } from '../Activity/Activity';
import { Comment } from '../Comment/Comment';
import { REGIONS_MAP, type RegionCode } from '../data/intl/regions';
import { useBoundStore } from '../data/store';
import { TripMap } from '../Map/TripMap';
import {
  RouteTripComment,
  RouteTripExpenses,
  RouteTripListView,
  RouteTripListViewActivity,
  RouteTripTaskList,
} from '../Routes/routes';
import { TaskStatus } from '../Task/TaskStatus';
import { TripUserRole } from '../User/TripUserRole';
import { getTripStatus } from './getTripStatus';
import {
  useCurrentTrip,
  useTripActivities,
  useTripAllCommentsWithLimit,
  useTripAllTaskLists,
  useTripExpenses,
  useTripTasks,
} from './store/hooks';
import type { TripSliceActivityWithTime } from './store/types';
import { TripEditDialog } from './TripDialog/TripEditDialog';
import { TripSharingDialog } from './TripDialog/TripSharingDialog';
import { TripStatusBadge } from './TripStatusBadge';
import { TaskCard, TaskCardUseCase } from './TripTask/TaskCard';
import { TripViewMode } from './TripViewMode';
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

  // Get activities and expenses for new features
  const activities = useTripActivities(trip?.activityIds ?? []);
  const expenses = useTripExpenses(trip?.expenseIds ?? []);

  // Calculate trip status and progress
  const tripStatus = useMemo(() => {
    if (!tripStartDateTime || !tripEndDateTime) return null;
    return getTripStatus(tripStartDateTime, tripEndDateTime);
  }, [tripStartDateTime, tripEndDateTime]);

  // Calculate expense summary
  const expenseSummary = useMemo(() => {
    if (!expenses || expenses.length === 0)
      return { total: 0, currency: trip?.originCurrency || 'USD' };

    const total = expenses.reduce((sum, expense) => {
      return sum + (expense.amountInOriginCurrency || expense.amount);
    }, 0);

    return { total, currency: trip?.originCurrency || 'USD' };
  }, [expenses, trip?.originCurrency]);

  // Today's activities (for ongoing trips)
  const todayActivities = useMemo(() => {
    if (!activities || !trip || tripStatus?.status !== 'current') return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const todayStart = now.startOf('day');
    const todayEnd = now.endOf('day');

    return activities
      .filter((activity) => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = DateTime.fromMillis(
          activity.timestampStart,
        ).setZone(trip.timeZone);
        return activityStart >= todayStart && activityStart <= todayEnd;
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0));
  }, [activities, trip, tripStatus]);

  // Upcoming activities (next 48 hours)
  const upcomingActivities = useMemo(() => {
    if (!activities || !trip) return [];

    const now = DateTime.now().setZone(trip.timeZone);
    const next48Hours = now.plus({ hours: 48 });

    return activities
      .filter((activity) => {
        if (!activity.timestampStart || !activity.timestampEnd) return false;
        const activityStart = DateTime.fromMillis(
          activity.timestampStart,
        ).setZone(trip.timeZone);
        return activityStart >= now && activityStart <= next48Hours;
      })
      .sort((a, b) => (a.timestampStart || 0) - (b.timestampStart || 0))
      .slice(0, 5) as TripSliceActivityWithTime[];
  }, [activities, trip]);

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

  // Dialog handlers
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
          <Heading as="h2" size="5">
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
          <Text as="p" size="2">
            {trip ? (
              <>
                {formatTripDateRange(trip)} ({trip.timeZone})
              </>
            ) : null}
          </Text>
          <Flex gap="2" mb="2" align="start">
            <TripStatusBadge
              tripStartDateTime={tripStartDateTime}
              tripEndDateTime={tripEndDateTime}
            />
          </Flex>

          {/* Today's Schedule for ongoing trips */}
          {tripStatus?.status === 'current' && todayActivities.length > 0 && (
            <>
              <Heading as="h3" size="4">
                Today's Schedule
              </Heading>
              <Flex gap="2" mb="2" direction="column">
                {todayActivities.map((activity) => {
                  const activityStartDateTime =
                    activity && activity.timestampStart != null
                      ? DateTime.fromMillis(activity.timestampStart).setZone(
                          trip?.timeZone || 'UTC',
                        )
                      : undefined;
                  const activityEndDateTime =
                    activity && activity.timestampEnd != null
                      ? DateTime.fromMillis(activity.timestampEnd).setZone(
                          trip?.timeZone || 'UTC',
                        )
                      : undefined;
                  const activityStartStr = activityStartDateTime
                    ? activityStartDateTime.toFormat('HH:mm')
                    : undefined;
                  const activityEndStr = activityEndDateTime
                    ? activityEndDateTime.toFormat('HH:mm')
                    : undefined;

                  return (
                    <Text key={activity.id} size="2">
                      {activityStartStr && activityEndStr ? (
                        // Both are set
                        <>
                          {activityStartStr}
                          &ndash;{activityEndStr}
                        </>
                      ) : activityStartStr ? (
                        // Only start is set
                        <>{activityStartStr} &ndash;No end time</>
                      ) : activityEndStr ? (
                        // Only end is set
                        <>No start time&ndash;{activityEndStr}</>
                      ) : (
                        // Both are not set
                        'No time set'
                      )}{' '}
                      &mdash;{' '}
                      <Link
                        to={
                          RouteTripListView.asRouteTarget() +
                          RouteTripListViewActivity.asRouteTarget(activity.id)
                        }
                      >
                        {activity.title}
                      </Link>
                      {activity.locationDestination}
                      {activity.location ? (
                        <>
                          {' '}
                          (
                          {
                            <Text color="gray">
                              {activity.location}
                              {activity.locationDestination
                                ? ` → ${activity.locationDestination}`
                                : null}
                            </Text>
                          }
                          )
                        </>
                      ) : null}
                    </Text>
                  );
                })}
              </Flex>
            </>
          )}
          <Heading as="h3" size="3">
            Details
          </Heading>
          <DataList.Root size="2" mb="2">
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
            {/* Expense Summary */}
            <DataList.Item>
              <DataList.Label>Total Expenses</DataList.Label>
              <DataList.Value>
                {expenseSummary.currency} {expenseSummary.total.toFixed(2)}
                <Button asChild variant="ghost" size="1" ml="2">
                  <Link to={RouteTripExpenses.asRouteTarget()}>View all</Link>
                </Button>
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>
          <Heading as="h3" size="3">
            Statistics
          </Heading>
          <DataList.Root size="2" mb="2">
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
        <Flex gap="2" direction="column" flexGrow="1" flexBasis="33%">
          <Heading as="h3" size="4" mb="2" mt="6">
            Priority Tasks{' '}
            <Button
              variant="ghost"
              asChild
              size="1"
              ml="2"
              style={{ verticalAlign: 'baseline' }}
            >
              <Link to={RouteTripTaskList.asRouteTarget()}>View all</Link>
            </Button>
          </Heading>
          <Flex gap="2" direction="column">
            {displayTasks.length === 0 && <Text size="2">No tasks yet</Text>}
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
        </Flex>
        <Flex gap="2" direction="column" flexGrow="1" flexBasis="33%">
          <Heading as="h3" size="4" mb="2" mt="6">
            Upcoming Activities
          </Heading>
          <Flex gap="2" direction="column">
            {upcomingActivities.length === 0 && (
              <Text size="2">No upcoming activities</Text>
            )}
            {upcomingActivities.map((activity) => {
              return (
                <Activity
                  key={activity.id}
                  activity={activity}
                  columnIndex={0}
                  columnEndIndex={0}
                  tripViewMode={TripViewMode.Home}
                  tripTimeZone={trip?.timeZone ?? 'UTC'}
                  tripTimestampStart={0}
                  userCanEditOrDelete={userCanModifyTrip}
                />
              );
            })}
          </Flex>
        </Flex>

        <Flex gap="2" direction="column" flexGrow="1" flexBasis="33%">
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
            {latestComments.length > 0 ? (
              <Text size="1" ml="7" mt="2">
                <Link to={RouteTripComment.asRouteTarget()}>
                  See all comments
                </Link>
              </Text>
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Container>
  );
}
