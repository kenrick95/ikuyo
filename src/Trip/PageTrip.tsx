import { Container, Heading } from '@radix-ui/themes';
import { Timetable } from '../Timetable/Timetable';
import { Navbar } from '../Nav/Navbar';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { RouteComponentProps } from 'wouter';
import { db } from '../data/db';
import { useMemo, useState } from 'react';
import { TripEditDialog } from './TripEditDialog';
import { useAuthUser } from '../Auth/hooks';
import { TripMenu } from './TripMenu';
import { DbTrip, DbTripWithActivity, DbUser } from '../data/types';

import s from './PageTrip.module.css';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { TripViewMode } from './TripViewMode';
import { ActivityList } from '../ActivityList/ActivityList';
import { TripDeleteDialog } from './TripDeleteDialog';
import { TripSharingDialog } from './TripSharingDialog';

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
      viewer: {},
      editor: {},
      owner: {},
    },
    user: {
      $: { where: { email: authUser?.email ?? '' } },
    },
  });
  const user = data?.user[0] as DbUser | undefined;
  const rawTrip = data?.trip[0] as DbTrip | undefined;

  const trip: undefined | DbTripWithActivity = useMemo(() => {
    if (rawTrip && rawTrip.activity) {
      rawTrip.activity = rawTrip.activity.map((activity) => {
        activity.trip = rawTrip;
        return activity;
      });
    }
    return rawTrip as undefined | DbTripWithActivity;
  }, [rawTrip]);

  const [newActivityDialogOpen, setNewActivityDialogOpen] = useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [deleteTripDialogOpen, setDeleteTripDialogOpen] = useState(false);
  const [shareTripDialogOpen, setShareTripDialogOpen] = useState(false);
  const [tripViewMode, setTripViewMode] = useState(TripViewMode.Timetable);

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
            setEditTripDialogOpen={setEditTripDialogOpen}
            setNewActivityDialogOpen={setNewActivityDialogOpen}
            setDeleteTripDialogOpen={setDeleteTripDialogOpen}
            setShareTripDialogOpen={setShareTripDialogOpen}
            tripViewMode={tripViewMode}
            setTripViewMode={setTripViewMode}
          />,
          <UserAvatarMenu user={user} />,
        ]}
      />
      <Container>
        {trip ? (
          tripViewMode === TripViewMode.Timetable ? (
            <Timetable
              trip={trip}
              setNewActivityDialogOpen={setNewActivityDialogOpen}
            />
          ) : (
            <ActivityList trip={trip} />
          )
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

      {editTripDialogOpen && trip ? (
        <TripEditDialog
          trip={trip}
          dialogOpen={editTripDialogOpen}
          setDialogOpen={setEditTripDialogOpen}
        />
      ) : null}

      {shareTripDialogOpen && trip && user ? (
        <TripSharingDialog
          trip={trip}
          dialogOpen={shareTripDialogOpen}
          setDialogOpen={setShareTripDialogOpen}
          user={user}
        />
      ) : null}

      {deleteTripDialogOpen && trip ? (
        <TripDeleteDialog
          trip={trip}
          dialogOpen={deleteTripDialogOpen}
          setDialogOpen={setDeleteTripDialogOpen}
        />
      ) : null}
    </>
  );
}
