import { Callout, Container, Spinner, Text } from '@radix-ui/themes';
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

const Timetable = withLoading()(
  React.lazy(() =>
    import('./TripTimetableView/Timetable').then((module) => {
      return { default: module.Timetable };
    }),
  ),
);
const ActivityList = withLoading()(
  React.lazy(() =>
    import('./TripListView/TripListView').then((module) => {
      return { default: module.TripListView };
    }),
  ),
);
const ExpenseList = withLoading()(
  React.lazy(() =>
    import('./TripExpenseViewCards').then((module) => {
      return { default: module.TripExpenseViewCards };
    }),
  ),
);
const PageTripMap = withLoading()(
  React.lazy(() =>
    import('./TripMapView').then((module) => {
      return { default: module.PageTripMap };
    }),
  ),
);
const TripHome = withLoading()(
  React.lazy(() =>
    import('./TripHome/TripHome').then((module) => {
      return { default: module.TripHome };
    }),
  ),
);
const TripComment = withLoading()(
  React.lazy(() =>
    import('./TripComment').then((module) => {
      return { default: module.TripComment };
    }),
  ),
);
const TripTaskList = withLoading()(
  React.lazy(() =>
    import('./TripTask/TripTaskList').then((module) => {
      return { default: module.TripTaskList };
    }),
  ),
);

import { useCurrentUser } from '../Auth/hooks';
import { useBoundStore } from '../data/store';
import { usePeriodicTripSync } from '../data/usePeriodicTripSync';
import {
  RouteLogin,
  RouteTripComment,
  RouteTripExpenses,
  RouteTripHome,
  RouteTripListView,
  RouteTripMap,
  RouteTripTaskList,
  RouteTripTimetableView,
} from '../Routes/routes';
import s from './PageTrip.module.css';
import { useTrip } from './store/hooks';
import type { TripSliceTrip } from './store/types';
import { TripMenuFloating } from './TripMenu/TripMenuFloating';
import { TripNavbar } from './TripNavbar/TripNavbar';
import { getTripCardViewTransitionName } from './viewTransition';

export default PageTrip;
export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const setCurrentTripId = useBoundStore((state) => state.setCurrentTripId);
  const subscribeTrip = useBoundStore((state) => state.subscribeTrip);
  const refreshTrip = useBoundStore((state) => state.refreshTrip);
  useEffect(() => {
    setCurrentTripId(tripId);
    return () => {
      setCurrentTripId(undefined);
    };
  }, [tripId, setCurrentTripId]);
  useEffect(() => {
    return subscribeTrip(tripId);
  }, [tripId, subscribeTrip]);
  // Poll the sync cursor and refetch the trip whenever changes arrive, so edits
  // by collaborators are reflected without a reload.
  usePeriodicTripSync(tripId, () => refreshTrip(tripId));
  const { trip, loading, error } = useTrip(tripId);

  return (
    <div
      className={s.page}
      style={{
        viewTransitionName: getTripCardViewTransitionName(tripId),
        viewTransitionClass: 'vt-trip-card',
      }}
    >
      <PageTripInner trip={trip} loading={loading} error={error} />
    </div>
  );
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
      <TripNavbar />
      {trip?.archivedAt != null ? (
        <Container>
          <Callout.Root my="2" color="gray" role="note">
            <Callout.Icon>
              <span aria-hidden>🔒</span>
            </Callout.Icon>
            <Callout.Text>Archived — content is read-only.</Callout.Text>
          </Callout.Root>
        </Container>
      ) : null}
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
      {!tripDefinitelyNotFound ? <TripMenuFloating /> : null}
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
          <Route
            path={RouteTripTaskList.routePath}
            component={TripTaskList}
            nest
          />
          <Route path={RouteTripHome.routePath} component={TripHome} />
          <Redirect replace to={RouteTripHome.routePath} />
        </Switch>
      ) : null}
    </>
  );
}
