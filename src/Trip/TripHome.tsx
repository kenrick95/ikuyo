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
import { REGIONS_MAP } from '../data/intl/regions';
import { useBoundStore } from '../data/store';
import { TripUserRole } from '../data/TripUserRole';
import { RouteTripComment } from '../Routes/routes';
import { TripMap } from '../TripMap/TripMap';
import { useCurrentTrip, useTripAllCommentsWithLimit } from './store/hooks';
import { TripEditDialog } from './TripEditDialog';
import { TripSharingDialog } from './TripSharingDialog';
import { TripStatusBadge } from './TripStatusBadge';
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
                {trip?.region ? REGIONS_MAP[trip.region] : null}
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
      {latestComments.length > 0 ? (
        <>
          <Heading as="h3" size="4" mb="2" mt="6">
            Latest Comments
          </Heading>
          <Flex gap="2" direction="column">
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
        </>
      ) : null}
    </Container>
  );
}
