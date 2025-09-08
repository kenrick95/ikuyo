import { CalendarIcon, CheckIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { useCallback } from 'react';
import { Link } from 'wouter';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { useBoundStore } from '../data/store';
import { RouteTripTaskList } from '../Routes/routes';
import type { TripSliceTrip } from './store/types';

interface TripGettingStartedProps {
  trip: TripSliceTrip;
}

export function TripGettingStarted({ trip }: TripGettingStartedProps) {
  const hasActivities = trip.activityIds.length > 0;
  const hasTasks = trip.taskListIds.length > 0;

  const pushDialog = useBoundStore((state) => state.pushDialog);

  const openActivityNewDialog = useCallback(() => {
    pushDialog(ActivityNewDialog, { trip });
  }, [trip, pushDialog]);

  return (
    <Flex direction="column" gap="4" mt="4">
      <Heading as="h2" size="4">
        Let's get your trip started!
      </Heading>

      <Text size="2" color="gray">
        Here are some things you can do to plan your trip:
      </Text>

      <Flex direction="column" gap="3">
        <Card>
          <Flex gap="3" align="center" p="3">
            <CalendarIcon width="20" height="20" />
            <Flex direction="column" gap="1" flexGrow="1">
              <Text weight="medium">Plan your activities</Text>
              <Text size="2" color="gray">
                Add places you want to visit, restaurants to try, and things to
                do
              </Text>
            </Flex>
            <Button
              variant={hasActivities ? 'outline' : 'solid'}
              onClick={openActivityNewDialog}
            >
              <PlusIcon />
              {hasActivities ? 'Add more' : 'Start planning'}
            </Button>
          </Flex>
        </Card>

        <Card>
          <Flex gap="3" align="center" p="3">
            <CheckIcon width="20" height="20" />
            <Flex direction="column" gap="1" flexGrow="1">
              <Text weight="medium">Create task lists</Text>
              <Text size="2" color="gray">
                Keep track of things to do before and during your trip
              </Text>
            </Flex>
            <Button asChild variant={hasTasks ? 'outline' : 'solid'}>
              <Link to={RouteTripTaskList.asRouteTarget()}>
                <PlusIcon />
                {hasTasks ? 'View tasks' : 'Create tasks'}
              </Link>
            </Button>
          </Flex>
        </Card>

        {/* Additional helpful actions for new trips */}
        <Card>
          <Flex gap="3" align="center" p="3">
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: 'var(--accent-9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text size="1" weight="bold">
                !
              </Text>
            </div>
            <Flex direction="column" gap="1" flexGrow="1">
              <Text weight="medium">Set your timezone</Text>
              <Text size="2" color="gray">
                Make sure your trip timezone is correct: {trip.timeZone}
              </Text>
            </Flex>
          </Flex>
        </Card>
      </Flex>
    </Flex>
  );
}
