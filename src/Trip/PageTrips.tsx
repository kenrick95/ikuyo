import { PlusIcon } from '@radix-ui/react-icons';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
} from '@radix-ui/themes';
import { useCallback, useMemo, useState } from 'react';
import { Link, type RouteComponentProps } from 'wouter';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import { db } from '../data/db';
import type { DbUser } from '../data/types';
import { ROUTES } from '../routes';
import s from './PageTrips.module.css';
import { TripGroup } from './TripGroup';
import { formatTimestampToReadableDate } from './time';

import { DateTime } from 'luxon';
import { DocTitle } from '../Nav/DocTitle';

import { TripNewDialog } from './TripNewDialog';
import type { DbTrip } from './db';

export default PageTrips;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PageTrips(_props: RouteComponentProps) {
  const { user: authUser } = useAuthUser();
  const [now] = useState(Date.now());
  const { isLoading, data, error } = db.useQuery({
    trip: {
      $: {
        where: {
          and: [
            { 'tripUser.user.email': authUser?.email ?? '' },
            // Fetch upcoming and ongoing only
            { timestampEnd: { $gte: now } },
          ],
        },
      },
      tripUser: {},
    },
    user: {
      $: {
        where: {
          email: authUser?.email ?? '',
        },
      },
    },
  });
  const user = data?.user?.[0] as DbUser | undefined;
  const [newTripDialogOpen, setNewTripDialogOpen] = useState(false);
  const tripGroups: Record<TripGroup, DbTrip[]> = useMemo(() => {
    const trips: DbTrip[] = data?.trip
      ? (data.trip as unknown as DbTrip[])
      : [];
    const groups: Record<TripGroup, DbTrip[]> = {
      [TripGroup.Upcoming]: [],
      [TripGroup.Ongoing]: [],
      [TripGroup.Past]: [],
    };
    const now = Date.now();
    for (const trip of trips) {
      if (trip.timestampStart > now) {
        groups[TripGroup.Upcoming].push(trip);
      } else if (trip.timestampEnd < now) {
        groups[TripGroup.Past].push(trip);
      } else {
        groups[TripGroup.Ongoing].push(trip);
      }
    }

    groups[TripGroup.Upcoming].sort(sortTripFn);
    groups[TripGroup.Ongoing].sort(sortTripFn);
    groups[TripGroup.Past].sort(sortTripFn).reverse();

    return groups;
  }, [data?.trip]);

  return (
    <>
      <DocTitle title={'Trips'} />
      <Navbar
        leftItems={[
          <Heading as="h2" size="5" key="trips">
            Trips
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu user={user} key="userAvatarMenu" />]}
      />

      <Container>
        {isLoading ? (
          'Loading'
        ) : error ? (
          `Error: ${error.message}`
        ) : (
          <Flex direction="column" my="2" gap="3" p="2">
            <Trips
              type={TripGroup.Ongoing}
              groupTitle="Ongoing Trips"
              trips={tripGroups[TripGroup.Ongoing]}
              setNewTripDialogOpen={setNewTripDialogOpen}
            />
            <Trips
              type={TripGroup.Upcoming}
              groupTitle="Upcoming Trips"
              trips={tripGroups[TripGroup.Upcoming]}
              setNewTripDialogOpen={setNewTripDialogOpen}
            />
            <PastTrips now={now} user={user} />
          </Flex>
        )}
      </Container>

      {newTripDialogOpen && user ? (
        <TripNewDialog
          user={user}
          dialogOpen={newTripDialogOpen}
          setDialogOpen={setNewTripDialogOpen}
        />
      ) : null}
    </>
  );
}

const pageSize = 9;
function PastTrips({ user, now }: { user: DbUser | undefined; now: number }) {
  const [limit, setLimit] = useState(0);
  const { isLoading, data, error, pageInfo } = db.useQuery(
    limit
      ? {
          trip: {
            $: {
              where: {
                and: [
                  { 'tripUser.user.email': user?.email ?? '' },
                  { timestampEnd: { $lt: now } },
                ],
              },
              order: {
                timestampEnd: 'desc',
              },
              limit: limit,
            },
            tripUser: {},
          },
        }
      : {},
  );
  const trips: DbTrip[] = data?.trip ? (data.trip as DbTrip[]) : [];
  const loadMore = useCallback(() => {
    setLimit((prevLimit) => {
      if (prevLimit === 0) {
        return pageSize;
      }
      return prevLimit + pageSize;
    });
  }, []);

  return (
    <Box>
      <Heading as="h2" mb="1">
        Past Trips
      </Heading>
      <Flex asChild gap="2" p="0" wrap="wrap">
        <ul>
          {limit !== 0 ? (
            <>
              {error ? `Error: ${error.message}` : null}
              {isLoading ? 'Loading...' : null}
              {trips.length === 0 && !isLoading && !error
                ? 'None'
                : trips.map((trip) => {
                    return (
                      <li className={s.tripLi} key={trip.id}>
                        <Card asChild>
                          <Link to={ROUTES.Trip.replace(':id', trip.id)}>
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
            </>
          ) : null}

          {pageInfo?.trip?.hasNextPage || limit === 0 ? (
            <Button variant="outline" onClick={loadMore}>
              Load more
            </Button>
          ) : null}
        </ul>
      </Flex>
    </Box>
  );
}

function Trips({
  type,
  groupTitle,
  trips,
  setNewTripDialogOpen,
}: {
  type: TripGroup;
  groupTitle: string;
  trips: DbTrip[];
  setNewTripDialogOpen: (v: boolean) => void;
}) {
  return (
    <Box>
      <Heading as="h2" mb="1">
        {groupTitle}

        {type === TripGroup.Upcoming ? (
          <Button
            variant="outline"
            onClick={() => {
              setNewTripDialogOpen(true);
            }}
            mx="3"
          >
            <PlusIcon /> New trip
          </Button>
        ) : null}
      </Heading>
      <Flex asChild gap="2" p="0" wrap="wrap">
        <ul>
          {trips.length === 0
            ? 'None'
            : trips.map((trip) => {
                return (
                  <li className={s.tripLi} key={trip.id}>
                    <Card asChild>
                      <Link to={ROUTES.Trip.replace(':id', trip.id)}>
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
      </Flex>
    </Box>
  );
}

function sortTripFn(tripA: DbTrip, tripB: DbTrip): number {
  if (tripA.timestampStart === tripB.timestampStart) {
    if (tripA.timestampEnd === tripB.timestampEnd) {
      return 0;
    }
    return tripA.timestampEnd - tripB.timestampEnd;
  }
  return tripA.timestampStart - tripB.timestampStart;
}
