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
import {
  RouteTripExpenses,
  RouteTripListView,
  RouteTripTimetableView,
} from '../Routes/routes';
import { TripUserRole } from '../data/TripUserRole';
import { TripMenuFloating } from './TripMenuFloating';
import { TripContext } from './context';
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
    <TripContext.Provider value={trip}>
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
                <Route path={RouteTripTimetableView.routePath}>
                  {' '}
                  <DoubleArrowRightIcon /> Timetable
                </Route>
                <Route path={RouteTripListView.routePath}>
                  {' '}
                  <DoubleArrowRightIcon />
                  List
                </Route>
                <Route path={RouteTripExpenses.routePath}>
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
              path={RouteTripTimetableView.routePath}
              component={Timetable}
              nest
            />
            <Route
              path={RouteTripListView.routePath}
              component={ActivityList}
              nest
            />
            <Route path={RouteTripExpenses.routePath} component={ExpenseList} />
            <Redirect replace to={RouteTripTimetableView.routePath} />
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
    </TripContext.Provider>
  );
}
