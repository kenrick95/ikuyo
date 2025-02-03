import React from 'react';
import { Container, Heading } from '@radix-ui/themes';
import { Navbar } from '../Nav/Navbar';
import { Redirect, Route, RouteComponentProps, Switch } from 'wouter';
import { db } from '../data/db';
import { useMemo, useState } from 'react';

import { useAuthUser } from '../Auth/hooks';
import { DbUser } from '../data/types';

import s from './PageTrip.module.css';

import { TripMenu } from './TripMenu';

import { DocTitle } from '../Nav/DocTitle';
import { withLoading } from '../Loading/withLoading';

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
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { TripEditDialog } from './TripEditDialog';
import { TripDeleteDialog } from './TripDeleteDialog';
import { TripSharingDialog } from './TripSharingDialog';
import { AccommodationNewDialog } from '../Accommodation/AccommodationNewDialog';
import { DbTrip, DbTripWithActivityAccommodation } from './db';
import { ROUTES_TRIP } from '../routes';
import { ExpenseList } from '../Expense/ExpenseList';
import { DoubleArrowRightIcon } from '@radix-ui/react-icons';
import { TripUserRole } from '../data/TripUserRole';

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
      accommodation: {},
      tripUser: {
        user: {},
      },
    },
    user: {
      $: { where: { email: authUser?.email ?? '' } },
    },
  });
  const user = data?.user[0] as DbUser | undefined;
  const rawTrip = data?.trip[0] as DbTrip | undefined;

  const currentUserIsOwner = useMemo(() => {
    for (const tripUser of rawTrip?.tripUser ?? []) {
      if (
        user?.id === tripUser.user?.[0]?.id &&
        tripUser.role === TripUserRole.Owner
      ) {
        return true;
      }
    }
    return false;
  }, [rawTrip, user]);

  const trip: undefined | DbTripWithActivityAccommodation = useMemo(() => {
    if (rawTrip) {
      const tripWithActivity = {
        ...rawTrip,
        activity:
          rawTrip.activity?.map((activity) => {
            activity.trip = rawTrip;
            return activity;
          }) ?? [],
        accommodation:
          rawTrip.accommodation?.map((accommodation) => {
            accommodation.trip = rawTrip;
            return accommodation;
          }) ?? [],
      } as DbTripWithActivityAccommodation;
      return tripWithActivity;
    }
    return undefined;
  }, [rawTrip]);

  const [newActivityDialogOpen, setNewActivityDialogOpen] = useState(false);
  const [newAcommodationDialogOpen, setNewAcommodationDialogOpen] =
    useState(false);
  const [editTripDialogOpen, setEditTripDialogOpen] = useState(false);
  const [deleteTripDialogOpen, setDeleteTripDialogOpen] = useState(false);
  const [shareTripDialogOpen, setShareTripDialogOpen] = useState(false);

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
            {
              <Switch>
                <Route path={ROUTES_TRIP.TimetableView}>
                  {' '}
                  <DoubleArrowRightIcon /> Timetable
                </Route>
                <Route path={ROUTES_TRIP.ListView}>
                  {' '}
                  <DoubleArrowRightIcon />
                  List
                </Route>
                <Route path={ROUTES_TRIP.Expenses}>
                  {' '}
                  <DoubleArrowRightIcon /> Expenses
                </Route>
              </Switch>
            }
          </Heading>,
        ]}
        rightItems={[
          <TripMenu
            key="menu"
            user={user}
            setEditTripDialogOpen={setEditTripDialogOpen}
            setNewActivityDialogOpen={setNewActivityDialogOpen}
            setNewAcommodationDialogOpen={setNewAcommodationDialogOpen}
            setDeleteTripDialogOpen={setDeleteTripDialogOpen}
            setShareTripDialogOpen={setShareTripDialogOpen}
            showTripSharing={currentUserIsOwner}
          />,
        ]}
      />
      <Container>
        {trip ? (
          <Switch>
            <Route
              path={ROUTES_TRIP.TimetableView}
              component={() => (
                <Timetable
                  trip={trip}
                  setNewActivityDialogOpen={setNewActivityDialogOpen}
                />
              )}
            />
            <Route
              path={ROUTES_TRIP.ListView}
              component={() => <ActivityList trip={trip} />}
            />
            <Route
              path={ROUTES_TRIP.Expenses}
              component={() => <ExpenseList trip={trip} />}
            />
            <Redirect
              replace
              to={ROUTES_TRIP.TimetableView.replace(':id', trip.id)}
            />
          </Switch>
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

      {newAcommodationDialogOpen && trip ? (
        <AccommodationNewDialog
          trip={trip}
          dialogOpen={newAcommodationDialogOpen}
          setDialogOpen={setNewAcommodationDialogOpen}
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
