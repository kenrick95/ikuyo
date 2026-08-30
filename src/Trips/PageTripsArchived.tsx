import {
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Skeleton,
} from '@radix-ui/themes';
import { useEffect } from 'react';
import { Link, type RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import { RouteTrips } from '../Routes/routes';
import s from './PageTrips.module.css';
import { TripCard } from './TripCard';

export default PageTripsArchived;

export function PageTripsArchived(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  const subscribeArchivedTrips = useBoundStore(
    (state) => state.subscribeArchivedTrips,
  );
  useEffect(() => {
    if (!currentUser) return;
    return subscribeArchivedTrips(currentUser.id);
  }, [currentUser, subscribeArchivedTrips]);
  const trips = useDeepBoundStore((state) =>
    currentUser
      ? (state.archivedTrips[JSON.stringify({ tripUser: currentUser.id })] ??
        [])
      : [],
  );
  const loading = useDeepBoundStore((state) => state.archivedTripsLoading);
  const error = useDeepBoundStore((state) => state.archivedTripsError);
  const hasMore = useDeepBoundStore((state) => state.archivedTripsHasMore);
  const loadMore = useDeepBoundStore((state) => state.archivedTripsLoadMore);
  const loadingMore = useDeepBoundStore(
    (state) => state.archivedTripsLoadingMore,
  );

  return (
    <>
      <DocTitle title="Archived Trips" />
      <Navbar
        leftItems={[
          <Heading as="h2" size="5" key="archivedTrips">
            Archived Trips
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu user={currentUser} key="userAvatarMenu" />,
        ]}
      />
      <Container>
        <Button mx="2" my="4" size="2" color="gray" variant="outline" asChild>
          <Link to={RouteTrips.asRootRoute()}>Back to Trips</Link>
        </Button>
        {error ? (
          <Callout.Root my="2">
            <Callout.Text>Error loading archived trips: {error}</Callout.Text>
          </Callout.Root>
        ) : null}
        <Flex asChild gap="2" p="2" wrap="wrap">
          <ul>
            {loading ? (
              <Skeleton>
                <TripCard
                  className={s.tripLi}
                  trip={{
                    id: 'skeleton',
                    title: 'Loading...',
                    timestampStart: 0,
                    timestampEnd: 0,
                    timeZone: 'UTC',
                    createdAt: 0,
                    lastUpdatedAt: 0,
                  }}
                />
              </Skeleton>
            ) : trips.length === 0 ? (
              'No archived trips.'
            ) : (
              trips.map((trip) => (
                <TripCard className={s.tripLi} trip={trip} key={trip.id} />
              ))
            )}
          </ul>
        </Flex>
        {hasMore ? (
          <Button
            variant="outline"
            color="gray"
            onClick={loadMore}
            mx="2"
            my="4"
            loading={!!loadingMore}
          >
            Load more
          </Button>
        ) : null}
      </Container>
    </>
  );
}
