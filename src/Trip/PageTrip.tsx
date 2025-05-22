import { Heading, Skeleton } from '@radix-ui/themes';
import React, { useEffect, useMemo } from 'react';
import { Redirect, Route, type RouteComponentProps, Switch } from 'wouter';
import { withLoading } from '../Loading/withLoading';
import { DocTitle } from '../Nav/DocTitle';
import { Navbar } from '../Nav/Navbar';
import s from './PageTrip.module.css';
import { TripMenu } from './TripMenu';

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
const ExpenseList = withLoading()(
  React.lazy(() =>
    import('../Expense/ExpenseList').then((module) => {
      return { default: module.ExpenseList };
    }),
  ),
);
const TripMap = withLoading()(
  React.lazy(() =>
    import('../TripMap/TripMap').then((module) => {
      return { default: module.TripMap };
    }),
  ),
);
const TripHome = withLoading()(
  React.lazy(() =>
    import('./TripHome').then((module) => {
      return { default: module.TripHome };
    }),
  ),
);
const TripComment = withLoading()(
  React.lazy(() =>
    import('./TripComment/TripComment').then((module) => {
      return { default: module.TripComment };
    }),
  ),
);

import { DoubleArrowRightIcon } from '@radix-ui/react-icons';
import { useDeepEqual } from '../data/hooks';
import { useBoundStore } from '../data/store';
import { TripUserRole } from '../data/TripUserRole';
import {
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTimetableView,
} from '../Routes/routes';
import { useTrip, useTripUserIds } from './hooks';
import type { TripSliceTrip } from './store';
import { TripMenuFloating } from './TripMenuFloating';

export default PageTrip;
export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const setCurrentTripId = useBoundStore((state) => state.setCurrentTripId);
  const subscribeTrip = useBoundStore((state) => state.subscribeTrip);
  useEffect(() => {
    setCurrentTripId(tripId);
    return () => {
      setCurrentTripId(undefined);
    };
  }, [tripId, setCurrentTripId]);
  useEffect(() => {
    return subscribeTrip(tripId);
  }, [tripId, subscribeTrip]);
  const trip = useTrip(tripId);

  return <PageTripInner trip={trip} />;
}

function PageTripInner({ trip }: { trip: TripSliceTrip | undefined }) {
  const user = useBoundStore(useDeepEqual((state) => state.currentUser));
  const tripUsers = useTripUserIds(trip?.tripUserIds ?? []);

  const currentUserIsOwner = useMemo(() => {
    for (const tripUser of tripUsers) {
      if (
        user?.id === tripUser.userId &&
        tripUser.role === TripUserRole.Owner
      ) {
        return true;
      }
    }
    return false;
  }, [tripUsers, user]);
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
            {trip?.title ?? <Skeleton>Trip title</Skeleton>}
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
                <Route path={RouteTripMap.routePath}>
                  {' '}
                  <DoubleArrowRightIcon />
                  Map
                </Route>
                <Route path={RouteTripExpenses.routePath}>
                  {' '}
                  <DoubleArrowRightIcon /> Expenses
                </Route>
                <Route path={RouteTripComment.routePath}>
                  {' '}
                  <DoubleArrowRightIcon /> Comments
                </Route>
              </Switch>
            }
          </Heading>,
        ]}
        rightItems={[
          <TripMenu key="menu" showTripSharing={currentUserIsOwner} />,
        ]}
      />
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
        <Route path={RouteTripMap.routePath} component={TripMap} />
        <Route path={RouteTripExpenses.routePath} component={ExpenseList} />
        <Route path={RouteTripComment.routePath} component={TripComment} />
        <Route path={RouteTripHome.routePath} component={TripHome} />
        <Redirect replace to={RouteTripHome.routePath} />
      </Switch>
      <TripMenuFloating />
    </>
  );
}
