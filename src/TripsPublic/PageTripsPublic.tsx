import {
  Box,
  Button,
  Callout,
  Container,
  Flex,
  Heading,
  Skeleton,
  Spinner,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useEffect } from 'react';
import type { RouteComponentProps } from 'wouter';
import { useCurrentUser } from '../Auth/hooks';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import s from './PageTripsPublic.module.css';
import { TripPublicCard } from './TripPublicCard';

export default PageTripsPublic;

const skeletonNow = DateTime.now().toMillis();

export function PageTripsPublic(_props: RouteComponentProps) {
  const currentUser = useCurrentUser();
  const subscribeTripsPublic = useBoundStore(
    (state) => state.subscribeTripsPublic,
  );

  useEffect(() => {
    const unsubscribe = subscribeTripsPublic();
    return unsubscribe;
  }, [subscribeTripsPublic]);

  const trips = useDeepBoundStore((state) => state.tripsPublic);
  const loading = useDeepBoundStore((state) => state.tripsPublicLoading);
  const error = useDeepBoundStore((state) => state.tripsPublicError);
  const hasMore = useDeepBoundStore((state) => state.tripsPublicHasMore);
  const loadMore = useBoundStore((state) => state.tripsPublicLoadMore);
  const loadingMore = useDeepBoundStore(
    (state) => state.tripsPublicLoadingMore,
  );

  return (
    <>
      <DocTitle title={'Public Trips'} />
      <Navbar
        leftItems={[
          <Heading as="h2" size="5" key="trips">
            Public Trip Directory
          </Heading>,
        ]}
        rightItems={[
          <UserAvatarMenu user={currentUser} key="userAvatarMenu" />,
        ]}
      />

      <Container>
        {error ? (
          <Callout.Root my="2">
            <Callout.Text>Error loading trips: {error}</Callout.Text>
          </Callout.Root>
        ) : null}

        <Box my="2" p="2">
          <Heading as="h2" mb="3">
            All Public Trips
            {loading ? <Spinner size="2" className={s.headingSpinner} /> : null}
          </Heading>

          <Flex asChild gap="2" p="0" wrap="wrap">
            <ul>
              {trips.length === 0 ? (
                loading ? (
                  <Skeleton>
                    <TripPublicCard
                      className={s.tripLi}
                      trip={{
                        id: 'skeleton',
                        title: 'Loading...',
                        timestampStart: skeletonNow,
                        timestampEnd: skeletonNow,
                        timeZone: 'UTC',
                        createdAt: skeletonNow,
                        lastUpdatedAt: skeletonNow,
                        ownerHandle: null,
                        activityCount: 0,
                      }}
                    />
                  </Skeleton>
                ) : (
                  <Text color="gray">No public trips found.</Text>
                )
              ) : (
                trips.map((trip) => (
                  <TripPublicCard
                    className={s.tripLi}
                    trip={trip}
                    key={trip.id}
                  />
                ))
              )}
            </ul>
          </Flex>
        </Box>

        {hasMore ? (
          <Button
            variant="outline"
            color="gray"
            onClick={() => {
              if (loadMore) {
                loadMore();
              }
            }}
            mx="2"
            mb="4"
            loading={!!loadingMore}
          >
            Load more
          </Button>
        ) : null}
      </Container>
    </>
  );
}
