import React from 'react';
import { Container, Heading } from '@radix-ui/themes';
import { Navbar } from '../Nav/Navbar';
import { RouteComponentProps } from 'wouter';
import { db } from '../data/db';
import { useMemo, useState } from 'react';

import { useAuthUser } from '../Auth/hooks';
import { DbTrip, DbTripWithActivity, DbUser } from '../data/types';

import s from './PageTrip.module.css';

import { TripMenu } from './TripMenu';
import { UserAvatarMenu } from '../Auth/UserAvatarMenu';
import { TripViewMode } from './TripViewMode';

import { DocTitle } from '../Nav/DocTitle';
import { withLoading } from '../Loading/withLoading';
import { DialogLoading } from '../Loading/DialogLoading';

const Timetable = withLoading()(
  React.lazy(() =>
    import('../Timetable/Timetable').then((module) => {
      return { default: module.Timetable };
    })
  )
);
const ActivityList = withLoading()(
  React.lazy(() =>
    import('../ActivityList/ActivityList').then((module) => {
      return { default: module.ActivityList };
    })
  )
);
const ActivityNewDialog = withLoading({ fallback: () => <DialogLoading /> })(
  React.lazy(() =>
    import('../Activity/ActivityNewDialog').then((module) => {
      return { default: module.ActivityNewDialog };
    })
  )
);
const TripEditDialog = withLoading({ fallback: () => <DialogLoading /> })(
  React.lazy(() =>
    import('./TripEditDialog').then((module) => {
      return { default: module.TripEditDialog };
    })
  )
);
const TripDeleteDialog = withLoading({ fallback: () => <DialogLoading /> })(
  React.lazy(() =>
    import('./TripDeleteDialog').then((module) => {
      return { default: module.TripDeleteDialog };
    })
  )
);
const TripSharingDialog = withLoading({ fallback: () => <DialogLoading /> })(
  React.lazy(() =>
    import('./TripSharingDialog').then((module) => {
      return { default: module.TripSharingDialog };
    })
  )
);

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

  const currentUserIsOwner = useMemo(() => {
    for (const tripUser of rawTrip?.owner ?? []) {
      if (user?.id === tripUser.id) {
        return true;
      }
    }
    return false;
  }, [rawTrip, user]);

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
      <DocTitle title={trip?.title ?? 'Trip'} />
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
            showTripSharing={currentUserIsOwner}
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

      {newActivityDialogOpen && trip ? (
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
