import { PlusIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Skeleton,
  Spinner,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import { Link, type RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { RouteAccountUpgrade } from '../Routes/routes';
import { TripNewDialog } from '../Trip/TripDialog/TripNewDialog';
import { TripGroup, type TripGroupType } from '../Trip/TripGroup';
import { useTripsGrouped } from './hooks';
import s from './PageTrips.module.css';
import type { TripsSliceTrip } from './store';
import { TripCard } from './TripCard';

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
  const tripsError = useDeepBoundStore((state) => state.tripsError);
  const tripsLoadMore = useDeepBoundStore((state) => state.tripsLoadMore);
  const tripsHasMore = useDeepBoundStore((state) => state.tripsHasMore);
  const tripsLoadingMore = useDeepBoundStore((state) => state.tripsLoadingMore);

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
        {currentUser && !currentUser?.email ? (
          <Callout.Root my="2">
            <Callout.Text>
              You're currently using a guest account.{' '}
              <Link to={RouteAccountUpgrade.asRouteTarget()}>
                Upgrade your account with email or Google login
              </Link>{' '}
              to keep your data.
              <br />
              Otherwise, data will be lost when you clear cookies or switch
              browsers.
            </Callout.Text>
          </Callout.Root>
        ) : null}
        {tripsError ? (
          <Callout.Root my="2">
            <Callout.Text>Error loading trips: {tripsError}</Callout.Text>
          </Callout.Root>
        ) : null}
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

        {tripsHasMore ? (
          <Button
            variant="outline"
            color="gray"
            onClick={() => {
              if (tripsLoadMore) {
                tripsLoadMore();
              }
            }}
            mx="2"
            mb="4"
            loading={!!tripsLoadingMore}
          >
            Load more
          </Button>
        ) : null}
      </Container>
    </>
  );
}

const now = DateTime.now().toMillis();

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
                <TripCard
                  className={s.tripLi}
                  trip={{
                    id: 'skeleton',
                    title: 'Loading...',
                    timestampStart: now,
                    timestampEnd: now,
                    timeZone: 'UTC',
                    createdAt: now,
                    lastUpdatedAt: now,
                  }}
                />
              </Skeleton>
            ) : (
              'None'
            )
          ) : (
            trips.map((trip) => {
              return (
                <TripCard className={s.tripLi} trip={trip} key={trip.id} />
              );
            })
          )}
        </ul>
      </Flex>
    </Box>
  );
}
