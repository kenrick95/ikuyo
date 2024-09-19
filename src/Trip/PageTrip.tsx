import { Container, Heading } from '@radix-ui/themes';
import { Timeline } from '../Event/Timeline';
import { Navbar } from '../Nav/Navbar';
import { ActivityNewDialog } from '../Event/ActivityNewDialog';
import { RouteComponentProps } from 'wouter';
import { db } from '../data/db';
import { useMemo, useState } from 'react';
import { TripEditDialog } from './TripEditDialog';
import { useAuthUser } from '../Auth/hooks';
import { TripMenu } from './TripMenu';
import { DbTrip, DbTripWithActivity } from '../data/types';

export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const { user } = useAuthUser();

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
  const rawTrip = data?.trip[0] as DbTrip | undefined;

  const trip = useMemo(() => {
    if (rawTrip && rawTrip.activity) {
      rawTrip.activity = rawTrip.activity.map((activity) => {
        activity.trip = rawTrip;
        return activity;
      });
    }
    return rawTrip;
  }, [rawTrip]);

  const [newActivityDialogOpen, setNewActivityDialogOpen] = useState(false);
  const [editTripDialgoOpen, setEditTripDialgoOpen] = useState(false);

  return (
    <>
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            {trip?.title ?? 'Loading trip'}
          </Heading>,
        ]}
        rightItems={[
          <span key="user">{user ? user.email : ''}</span>,
          <TripMenu
            key="menu"
            setEditTripDialgoOpen={setEditTripDialgoOpen}
            setNewActivityDialogOpen={setNewActivityDialogOpen}
          />,
        ]}
      />
      <Container>
        {trip ? (
          <Timeline
            trip={trip as DbTripWithActivity}
            setNewActivityDialogOpen={setNewActivityDialogOpen}
          />
        ) : isLoading ? (
          'Loading'
        ) : error ? (
          `Error: ${error.message}`
        ) : (
          ''
        )}
      </Container>

      {trip ? (
        <ActivityNewDialog
          trip={trip}
          dialogOpen={newActivityDialogOpen}
          setDialogOpen={setNewActivityDialogOpen}
        />
      ) : null}

      {editTripDialgoOpen && trip ? (
        <TripEditDialog
          trip={trip}
          dialogOpen={editTripDialgoOpen}
          setDialogOpen={setEditTripDialgoOpen}
        />
      ) : null}
    </>
  );
}
