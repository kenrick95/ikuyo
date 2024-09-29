import { Link } from 'wouter';
import { db } from '../data/db';
import { ROUTES } from '../routes';
import { useAuthUser } from '../Auth/hooks';
import { Navbar } from '../Nav/Navbar';
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Text,
} from '@radix-ui/themes';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import s from './PageTrips.module.css';
import { formatTimestampToReadableDate } from './time';
import { useMemo, useState } from 'react';
import { DbTrip, DbUser } from '../data/types';
import { TripGroup } from './TripGroup';
import { PlusIcon } from '@radix-ui/react-icons';
import { TripNewDialog } from './TripNewDialog';

export default PageTrips;
export function PageTrips() {
  const { user: authUser } = useAuthUser();
  const { isLoading, data, error } = db.useQuery({
    trip: {
      $: {
        where: {
          or: [
            { 'editor.email': authUser?.email ?? '' },
            { 'viewer.email': authUser?.email ?? '' },
            { 'owner.email': authUser?.email ?? '' },
          ],
        },
      },
      viewer: {},
      editor: {},
      owner: {},
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
    const trips: DbTrip[] = data?.trip ? data.trip as DbTrip[] : [];
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
            <Trips
              type={TripGroup.Past}
              groupTitle="Past Trips"
              trips={tripGroups[TripGroup.Past]}
              setNewTripDialogOpen={setNewTripDialogOpen}
            />
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
                            trip.timestampStart,
                            trip.timeZone
                          )}{' '}
                          &ndash;{' '}
                          {formatTimestampToReadableDate(
                            trip.timestampEnd,
                            trip.timeZone
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
