import { PlusIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Skeleton,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { Link, type RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { RouteTrip } from '../Routes/routes';
import { TripGroup, type TripGroupType } from '../Trip/TripGroup';
import { TripNewDialog } from '../Trip/TripNewDialog';
import { formatTripDateRange } from '../Trip/time';
import { useTripsGrouped } from './hooks';
import s from './PageTrips.module.css';
import type { TripsSliceTrip } from './store';

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
  const tripsLoading = useDeepBoundStore((state) => state.tripsLoading);
  // TODO: how to show error
  // const tripsError = useDeepBoundStore((state) => state.tripsError);

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

        {isLoading ? <Spinner size="2" className={s.headingSpinner} /> : null}

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
        <ul>
          {trips.length === 0 ? (
            isLoading ? (
              <Skeleton>
                <li className={s.tripLi}>
                  <Card>
                    <Text as="div" weight="bold">
                      Trip title
                    </Text>
                    <Text as="div" size="2" color="gray">
                      Trip dates and time zone
                    </Text>
                  </Card>
                </li>
              </Skeleton>
            ) : (
              'None'
            )
          ) : (
            trips.map((trip) => {
              return (
                <li className={s.tripLi} key={trip.id}>
                  <Card asChild>
                    <Link to={RouteTrip.asRouteTarget(trip.id)}>
                      <Text as="div" weight="bold">
                        {trip.title}
                      </Text>
                      <Text as="div" size="2" color="gray">
                        {formatTripDateRange(trip)} ({trip.timeZone})
                      </Text>
                    </Link>
                  </Card>
                </li>
              );
            })
          )}
        </ul>
      </Flex>
    </Box>
  );
}
