import { PlusIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { Link, type RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useDeepEqual } from '../data/hooks';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { RouteTrip } from '../Routes/routes';
import s from './PageTrips.module.css';
import { TripGroup, type TripGroupType } from './TripGroup';
import { TripNewDialog } from './TripNewDialog';
import { type TripsSliceTrip, useTripsGrouped } from './Trips/store';
import { formatTimestampToReadableDate } from './time';

export default PageTrips;

export function PageTrips(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  const [now] = useState(Date.now());
  const subscribeTrips = useBoundStore((state) => state.subscribeTrips);
  useEffect(() => {
    let unsubscribe = () => {};
    if (currentUser) {
      unsubscribe = subscribeTrips(currentUser.id, now);
    }
    return unsubscribe;
  }, [currentUser, subscribeTrips, now]);
  const tripGroups = useTripsGrouped(currentUser?.id, now);
  const tripsLoading = useBoundStore(
    useDeepEqual((state) => state.tripsLoading),
  );
  // TODO: how to show error
  // const tripsError = useBoundStore(useDeepEqual((state) => state.tripsError));

  return (
    <>
      <DocTitle title={'Trips'} />
      <Navbar
        leftItems={[
          <Heading as="h2" size="5" key="trips">
            Trips
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu user={currentUser} key="userAvatarMenu" />,
        ]}
      />

      <Container>
        <Flex direction="column" my="2" gap="3" p="2">
          <Trips
            type={TripGroup.Ongoing}
            groupTitle="Ongoing Trips"
            trips={tripGroups[TripGroup.Ongoing]}
            user={currentUser}
            isLoading={tripsLoading}
          />
          <Trips
            type={TripGroup.Upcoming}
            groupTitle="Upcoming Trips"
            trips={tripGroups[TripGroup.Upcoming]}
            user={currentUser}
            isLoading={tripsLoading}
          />
          <Trips
            type={TripGroup.Past}
            groupTitle="Past Trips"
            trips={tripGroups[TripGroup.Past]}
            user={currentUser}
            isLoading={tripsLoading}
          />
        </Flex>
      </Container>
    </>
  );
}

function Trips({
  type,
  groupTitle,
  trips,
  user,
  isLoading,
}: {
  type: TripGroupType;
  groupTitle: string;
  trips: TripsSliceTrip[];
  user: DbUser | undefined;
  isLoading: boolean;
}) {
  const pushDialog = useBoundStore((state) => state.pushDialog);

  return (
    <Box>
      <Heading as="h2" mb="1">
        {groupTitle}

        {type === TripGroup.Upcoming && !isLoading ? (
          <Button
            variant="outline"
            onClick={() => {
              if (user) {
                pushDialog(TripNewDialog, { user });
              }
            }}
            mx="3"
          >
            <PlusIcon /> New trip
          </Button>
        ) : null}
      </Heading>
      <Flex asChild gap="2" p="0" wrap="wrap">
        {isLoading ? (
          <Spinner size="2" />
        ) : (
          <ul>
            {trips.length === 0
              ? 'None'
              : trips.map((trip) => {
                  return (
                    <li className={s.tripLi} key={trip.id}>
                      <Card asChild>
                        <Link to={RouteTrip.asRouteTarget(trip.id)}>
                          <Text as="div" weight="bold">
                            {trip.title}
                          </Text>
                          <Text as="div" size="2" color="gray">
                            {formatTimestampToReadableDate(
                              DateTime.fromMillis(trip.timestampStart, {
                                zone: trip.timeZone,
                              }),
                            )}{' '}
                            &ndash;{' '}
                            {formatTimestampToReadableDate(
                              DateTime.fromMillis(trip.timestampEnd, {
                                zone: trip.timeZone,
                              }).minus({
                                day: 1,
                              }),
                            )}{' '}
                            ({trip.timeZone})
                          </Text>
                        </Link>
                      </Card>
                    </li>
                  );
                })}
          </ul>
        )}
      </Flex>
    </Box>
  );
}
