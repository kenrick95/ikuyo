import { Link } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import { Box, Card, Container, Flex, Heading, Text } from '@radix-ui/themes';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import s from './PageTrips.module.css';
import { formatTimestampToReadableDate } from './time';
import { useMemo } from 'react';
import { DbTrip } from '../data/types';
import { TripGroup } from './TripGroup';

export default PageTrips;
export function PageTrips() {
  const { user: authUser } = useAuthUser();
  const { isLoading, data, error } = db.useQuery({
    trip: {
      $: {
        where: {
          'user.email': authUser?.email,
        },
      },
    },
    user: {
      $: {
        where: {
          email: authUser?.email,
        },
      },
    },
  });
  const user = data?.user[0];
  const tripGroups: Record<TripGroup, DbTrip[]> = useMemo(() => {
    const trips: DbTrip[] = data?.trip ? data.trip : [];
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
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            Trips
          </Heading>,
        ]}
        rightItems={[<UserAvatarMenu user={user} />]}
      />

      <Container>
        {isLoading ? (
          'Loading'
        ) : error ? (
          `Error: ${error.message}`
        ) : (
          <>
            <Trips
              groupTitle="Ongoing Trips"
              trips={tripGroups[TripGroup.Past]}
            />
            <Trips
              groupTitle="Upcoming Trips"
              trips={tripGroups[TripGroup.Upcoming]}
            />
            <Trips groupTitle="Past Trips" trips={tripGroups[TripGroup.Past]} />
          </>
        )}
      </Container>
    </>
  );
}

function Trips({ groupTitle, trips }: { groupTitle: string; trips: DbTrip[] }) {
  return (
    <Box m="2" mb="4">
      <Heading as="h2" mb="1">
        {groupTitle}
      </Heading>
      <Flex asChild gap="3" my="2" p="0" wrap="wrap">
        <ul>
          {trips.length === 0
            ? 'None'
            : trips.map((trip, i) => {
                return (
                  <li className={s.tripLi}>
                    <Card asChild key={i}>
                      <Link to={ROUTES.Trip.replace(':id', trip.id)}>
                        <Text as="div" weight="bold">
                          {trip.title}
                        </Text>
                        <Text as="div" size="2" color="gray">
                          {formatTimestampToReadableDate(trip.timestampStart)}{' '}
                          &ndash;
                          {formatTimestampToReadableDate(trip.timestampEnd)}
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
