import { Container, Heading, Skeleton, Spinner, Text } from '@radix-ui/themes';
import React, { useEffect } from 'react';
import {
  Link,
  Redirect,
  Route,
  type RouteComponentProps,
  Switch,
} from 'wouter';
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
const PageTripMap = withLoading()(
  React.lazy(() =>
    import('../TripMap/PageTripMap').then((module) => {
      return { default: module.PageTripMap };
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
import { useCurrentUser } from '../Auth/hooks';
import { useBoundStore } from '../data/store';
import {
  RouteLogin,
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTimetableView,
} from '../Routes/routes';
import { useTrip } from './store/hooks';
import type { TripSliceTrip } from './store/types';
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
  const { trip, loading, error } = useTrip(tripId);

  return <PageTripInner trip={trip} loading={loading} error={error} />;
}

function PageTripInner({
  trip,
  loading,
  error,
}: {
  trip: TripSliceTrip | undefined;
  loading: boolean | undefined;
  error: string | undefined;
}) {
  const tripDefinitelyNotFound = !trip && !loading && !error;
  const currentUser = useCurrentUser();
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
        rightItems={[<TripMenu key="menu" />]}
      />
      {!trip ? (
        loading ? (
          <Spinner size="2" />
        ) : error ? (
          <Text as="p">{error}</Text>
        ) : (
          <Container>
            <Text as="p">
              Either trip does not exist or you don't have permission to view
              this trip
            </Text>
            {!currentUser ? (
              <Text as="p">
                Try <Link to={RouteLogin.asRootRoute()}>logging in</Link>
              </Text>
            ) : null}
          </Container>
        )
      ) : null}
      {!tripDefinitelyNotFound ? (
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
          <Route path={RouteTripMap.routePath} component={PageTripMap} />
          <Route path={RouteTripExpenses.routePath} component={ExpenseList} />
          <Route path={RouteTripComment.routePath} component={TripComment} />
          <Route path={RouteTripHome.routePath} component={TripHome} />
          <Redirect replace to={RouteTripHome.routePath} />
        </Switch>
      ) : null}
      {!tripDefinitelyNotFound ? <TripMenuFloating /> : null}
    </>
  );
}
