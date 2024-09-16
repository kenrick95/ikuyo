import { Container, Heading } from '@radix-ui/themes';
import { Timeline } from '../Event/Timeline';
import { Navbar } from '../Nav/Navbar';
import { NewActivityButton } from '../Event/NewActivityButton';
import { RouteComponentProps } from 'wouter';
import { db } from '../data/db';
import { useMemo } from 'react';

export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const { isLoading, error, data } = db.useQuery({
    trip: {
      $: {
        where: {
          id: tripId,
        },
      },
      activity: {},
    },
  });
  const trip = data?.trip[0];
  const activities = useMemo(() => {
    return (
      trip?.activity?.map((activity) => {
        activity.trip = trip;
        return activity;
      }) ?? []
    );
  }, [trip]);

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
        ) : isLoading ? (
          'Loading'
        ) : error ? (
          `Error: ${error.message}`
        ) : (
          ''
        )}
      </Container>
    </>
  );
}
