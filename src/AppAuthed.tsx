import { Container } from '@radix-ui/themes';
import { useMemo } from 'react';
import { db } from './data/db';
import { Timeline } from './Event/Timeline';
import { Navbar } from './Nav/Navbar';
import { User } from '@instantdb/react';

export function AppAuthed({ user }: { user: User }) {
  const { isLoading, error, data } = db.useQuery({
    user: {
      $: {
        where: {
          email: user.email,
        },
      },
      trip: {
        activity: {},
      },
    },
  });

  const { trip, activities } = useMemo(() => {
    const trip = data?.user[0]?.trip[0];
    const activities =
      trip?.activity.map((activity) => {
        activity.trip = trip;
        return activity;
      }) ?? [];
    return {
      trip,
      activities,
    };
  }, [data]);
  // Let's focus on 1 user and 1 trip for now
  console.log('data', data);

  if (isLoading || !trip || !activities) {
    return <div>Fetching data...</div>;
  }
  if (error) {
    return <div>Error fetching data: {error.message}</div>;
  }

  return (
    <>
      <Navbar trip={trip} />
      <Container>
        <Timeline trip={trip} activities={activities} />
      </Container>
    </>
  );
}
