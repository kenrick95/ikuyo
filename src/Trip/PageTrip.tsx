import { Container, Heading } from '@radix-ui/themes';
import { Timeline } from '../Event/Timeline';
import { Navbar } from '../Nav/Navbar';
import { NewActivityButton } from '../Event/NewActivityButton';
import { RouteComponentProps } from 'wouter';
import { useBoundStore } from '../data/store';
import { useEffect, useMemo } from 'react';
import { useAuthUser } from '../Auth/hooks';
import { db } from '../data/db';

export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const { user } = useAuthUser();
  const addUser = useBoundStore((state) => state.addUser);
  // TODO: perhaps only fetch this trip & the activities related...
  const { data } = db.useQuery({
    user: {
      $: {
        where: {
          email: user?.email,
        },
      },
      trip: {
        activity: {},
      },
    },
  });

  useEffect(() => {
    if (data?.user[0]) {
      addUser(data?.user[0]);
    }
  }, [data, addUser]);

  const trips = useBoundStore((state) => state.trips);
  const { trip, activities } = useMemo(() => {
    // TODO: optimize this to a map?
    const trip = trips.find((trip) => trip.id === tripId);
    const activities = trip?.activity;
    return {
      trip,
      activities,
    };
  }, [trips, tripId]);

  return (
    <>
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            {trip?.title ?? 'Loading trip'}
          </Heading>,
        ]}
        rightItems={[trip ? <NewActivityButton trip={trip} /> : '']}
      />
      <Container>
        {trip && activities ? (
          <Timeline trip={trip} activities={activities} />
        ) : (
          ''
        )}
      </Container>
    </>
  );
}
