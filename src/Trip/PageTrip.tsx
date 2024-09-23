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
import { DbTrip, DbTripWithActivity, DbUser } from '../data/types';

import s from './PageTrip.module.css';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';

export default PageTrip;
export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const { user: authUser } = useAuthUser();

  const { isLoading, error, data } = db.useQuery({
    trip: {
      $: {
        where: {
          id: tripId,
        },
      },
      activity: {},
    },
    user: {
      $: { where: { email: authUser?.email } },
    },
  });
  const user = data?.user[0] as DbUser | undefined;
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
          <Heading
            as="h1"
            size={{ initial: '3', xs: '5' }}
            className={s.tripTitle}
          >
            {trip?.title ?? 'Loading trip'}
          </Heading>,
        ]}
        rightItems={[
          <TripMenu
            key="menu"
            setEditTripDialgoOpen={setEditTripDialgoOpen}
            setNewActivityDialogOpen={setNewActivityDialogOpen}
          />,
          <UserAvatarMenu user={user} />,
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
