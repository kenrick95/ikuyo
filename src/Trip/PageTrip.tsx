import { Container, Heading } from '@radix-ui/themes';
import React from 'react';
import { useMemo } from 'react';
import { Redirect, Route, type RouteComponentProps, Switch } from 'wouter';
import { Navbar } from '../Nav/Navbar';
import { db } from '../data/db';

import { useAuthUser } from '../Auth/hooks';
import type { DbUser } from '../data/types';

import s from './PageTrip.module.css';

import { TripMenu } from './TripMenu';

import { withLoading } from '../Loading/withLoading';
import { DocTitle } from '../Nav/DocTitle';

const Timetable = withLoading()(
  React.lazy(() =>
    import('../Timetable/Timetable').then((module) => {
      return { default: module.Timetable };
    }),
  ),
);
const ActivityList = withLoading()(
  React.lazy(() =>
    import('../ActivityList/ActivityList').then((module) => {
      return { default: module.ActivityList };
    }),
  ),
);
import { DoubleArrowRightIcon } from '@radix-ui/react-icons';
import { ExpenseList } from '../Expense/ExpenseList';
import { TripUserRole } from '../data/TripUserRole';
import { ROUTES_TRIP } from '../Routes/routes';
import { TripMenuFloating } from './TripMenuFloating';
import type { DbTrip, DbTripFull } from './db';

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
      macroplan: {},
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

  const trip: undefined | DbTripFull = useMemo(() => {
    if (rawTrip) {
      // Reference to the trip in the activities, accommodations and macroplans
      const tripWithBackReference = {
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
        macroplan:
          rawTrip.macroplan?.map((macroplan) => {
            macroplan.trip = rawTrip;
            return macroplan;
          }) ?? [],
      } as DbTripFull;
      return tripWithBackReference;
    }
    return undefined;
  }, [rawTrip]);

  return (
    <>
      <DocTitle title={trip?.title ?? 'Trip'} />
      <Navbar
        leftItems={[
          <Heading
            as="h1"
            size={{ initial: '3', xs: '5' }}
            className={s.tripTitle}
            key="title"
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
            trip={trip}
            showTripSharing={currentUserIsOwner}
          />,
        ]}
      />
      <Container>
        {trip ? (
          <Switch>
            <Route
              path={ROUTES_TRIP.TimetableView}
              component={() => <Timetable trip={trip} />}
              nest
            />
            <Route
              path={ROUTES_TRIP.ListView}
              component={() => <ActivityList trip={trip} />}
              nest
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
      <TripMenuFloating />
    </>
  );
}
