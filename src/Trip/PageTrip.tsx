import { Button, Container, Heading } from '@radix-ui/themes';
import { Timeline } from '../Event/Timeline';
import { Navbar } from '../Nav/Navbar';
import { NewActivityButton } from '../Event/NewActivityButton';
import { RouteComponentProps } from 'wouter';
import { db } from '../data/db';
import { useMemo, useState } from 'react';
import { TripEditDialog } from './TripEditDialog';
import { useAuthUser } from '../Auth/hooks';

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
  const trip = data?.trip[0];
  const activities = useMemo(() => {
    return (
      trip?.activity?.map((activity) => {
        activity.trip = trip;
        return activity;
      }) ?? []
    );
  }, [trip]);

  const [newActivityDialogOpen, setNewActivityDialogOpen] = useState(false);
  const [editTripDialgoOpen, setEditTripDialgoOpen] = useState(false);

  return (
    <>
      <Navbar
        leftItems={[
          <Heading as="h2" size="5">
            {trip?.title ?? 'Loading trip'}
          </Heading>,
          <Button
            variant="outline"
            onClick={() => {
              setEditTripDialgoOpen(true);
            }}
          >
            Edit trip
          </Button>,
        ]}
        rightItems={[
          user ? `Logged in as ${user.email}` : '',
          trip ? (
            <NewActivityButton
              trip={trip}
              dialogOpen={newActivityDialogOpen}
              setDialogOpen={setNewActivityDialogOpen}
            />
          ) : (
            ''
          ),
        ]}
      />
      <Container>
        {trip && activities ? (
          <Timeline
            trip={trip}
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
