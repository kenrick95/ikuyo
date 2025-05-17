import { Heading, Skeleton, Spinner } from '@radix-ui/themes';
import React, { useEffect, useMemo, useRef } from 'react';
import { Redirect, Route, type RouteComponentProps, Switch } from 'wouter';
import { db } from '../data/db';
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
import { useShallow } from 'zustand/shallow';
import type { DbCommentGroup } from '../Comment/db';
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
import { TripContext } from './context';
import type { DbTrip, DbTripFull } from './db';
import { TripMenuFloating } from './TripMenuFloating';

export default PageTrip;
export function PageTrip({ params }: RouteComponentProps<{ id: string }>) {
  const { id: tripId } = params;
  const { trip, isLoading, error } = useStableRefTrip(tripId);

  return <PageTripInner trip={trip} isLoading={isLoading} error={error} />;
}

function PageTripInner({
  trip,
  isLoading,
  error,
}: {
  trip: DbTripFull | undefined;
  isLoading: boolean;
  error: { message: string } | undefined;
}) {
  const user = useBoundStore(useShallow((state) => state.currentUser));

  const currentUserIsOwner = useMemo(() => {
    for (const tripUser of trip?.tripUser ?? []) {
      if (
        user?.id === tripUser.user?.[0]?.id &&
        tripUser.role === TripUserRole.Owner
      ) {
        return true;
      }
    }
    return false;
  }, [trip, user]);
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
          <TripMenu
            key="menu"
            user={user}
            trip={trip}
            showTripSharing={currentUserIsOwner}
          />,
        ]}
      />
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
          <Route path={RouteTripMap.routePath} component={TripMap} />
          <Route path={RouteTripExpenses.routePath} component={ExpenseList} />
          <Route path={RouteTripComment.routePath} component={TripComment} />
          <Route path={RouteTripHome.routePath} component={TripHome} />
          <Redirect replace to={RouteTripHome.routePath} />
        </Switch>
      ) : isLoading ? (
        <Spinner m="3" />
      ) : error ? (
        `Error: ${error.message}`
      ) : (
        ''
      )}
      <TripMenuFloating />
    </TripContext.Provider>
  );
}
function useStableRefTrip(tripId: string): {
  trip: DbTripFull | undefined;
  isLoading: boolean;
  error: { message: string } | undefined;
} {
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
        user: {
          $: { fields: ['id', 'handle', 'activated'] },
        },
      },
      commentGroup: {
        comment: {
          user: {
            $: { fields: ['id', 'handle', 'activated'] },
          },
        },
        object: {
          activity: { $: { fields: ['id', 'title'] } },
          accommodation: { $: { fields: ['id', 'name'] } },
          expense: { $: { fields: ['id', 'title'] } },
          trip: { $: { fields: ['id', 'title'] } },
          macroplan: { $: { fields: ['id', 'name'] } },
          $: {
            fields: ['type'],
          },
        },
      },
    },
  });
  const rawTrip = data?.trip[0] as DbTrip | undefined;
  console.log('rawTrip', rawTrip);
  // Avoid re-render of trip object
  // Only re-render if trip, trip.activity, trip.accommodation, trip.macroplan is different
  const tripRef = useRef<DbTripFull | undefined>(undefined);

  const trip = useMemo(() => {
    if (rawTrip) {
      let isObjectEqual = false;

      const commentGroupActivityByActivityId = new Map<
        string,
        DbCommentGroup<'activity'>
      >();
      const commentGroup =
        rawTrip.commentGroup?.map((commentGroup) => {
          commentGroup.trip = rawTrip;
          commentGroup.comment = commentGroup.comment.map((comment) => {
            comment.group = commentGroup;
            return comment;
          });
          if (
            commentGroup.object?.type === 'activity' &&
            commentGroup.object?.activity?.[0]
          ) {
            commentGroupActivityByActivityId.set(
              commentGroup.object.activity[0].id,
              commentGroup as DbCommentGroup<'activity'>,
            );
          }
          return commentGroup;
        }) ?? [];

      // Reference to the trip in the activities, accommodations and macroplans
      const tripWithBackReference = {
        ...rawTrip,
        activity:
          rawTrip.activity?.map((activity) => {
            activity.trip = rawTrip;
            const commentGroup = commentGroupActivityByActivityId.get(
              activity.id,
            );
            if (commentGroup) {
              activity.commentGroup = commentGroup;
            }
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
        commentGroup: commentGroup,
      } as DbTripFull;

      isObjectEqual =
        isObjectEqualForSimpleKeys(tripRef.current, tripWithBackReference) &&
        isArrayOfObjectsEqual(
          tripRef.current?.accommodation,
          tripWithBackReference.accommodation,
        ) &&
        isArrayOfObjectsEqual(
          tripRef.current?.activity,
          tripWithBackReference.activity,
        ) &&
        isArrayOfObjectsEqual(
          tripRef.current?.macroplan,
          tripWithBackReference.macroplan,
        ) &&
        isArrayOfObjectsEqual(
          tripRef.current?.tripUser,
          tripWithBackReference.tripUser,
        ) &&
        isArrayOfObjectsEqual(
          tripRef.current?.commentGroup,
          tripWithBackReference.commentGroup,
        );

      if (isObjectEqual) {
        return tripRef.current;
      }

      tripRef.current = tripWithBackReference;
      return tripWithBackReference;
    }
    return undefined;
  }, [rawTrip]);

  const setTrip = useBoundStore((state) => state.setTrip);
  useEffect(() => {
    if (trip) {
      setTrip(trip);
    }
  }, [trip, setTrip]);

  return { trip, isLoading, error };
}

function isObjectEqualForSimpleKeys<T extends object, K extends keyof T>(
  obj1: T | undefined,
  obj2: T | undefined,
): boolean {
  if (obj1 === obj2) {
    // both are equal, or both are undefined
    return true;
  }
  if (!obj1 || !obj2) {
    // one of them is undefined
    return false;
  }
  const keys1 = Object.keys(obj1 ?? {}) as K[];
  const keys2 = Object.keys(obj2 ?? {}) as K[];
  // Check if both objects have the same number of keys
  if (keys1.length !== keys2.length) {
    return false;
  }
  // Check if all keys are present in both objects
  const keys1Set = new Set(keys1);
  const keys2Set = new Set(keys2);
  for (const key of keys1) {
    if (!keys2Set.has(key)) {
      return false;
    }
  }
  for (const key of keys2) {
    if (!keys1Set.has(key)) {
      return false;
    }
  }
  // keys1 === keys2
  for (const key of keys1) {
    if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      continue; // Skip nested objects
    }
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }
  return true;
}
function isArrayOfObjectsEqual<
  T extends { id: string; [key: string]: unknown },
>(arr1: T[] | undefined, arr2: T[] | undefined): boolean {
  if (arr1 === arr2) {
    return true;
  }
  if (!arr1 || !arr2) {
    return false;
  }
  if (arr1.length !== arr2.length) {
    return false;
  }
  const arr1Ids = new Set(arr1.map((item) => item.id));
  const arr2Ids = new Set(arr2.map((item) => item.id));

  // Check if both arrays have the same number of ids
  for (const key of arr1Ids) {
    if (!arr2Ids.has(key)) {
      return false;
    }
  }
  for (const key of arr2Ids) {
    if (!arr1Ids.has(key)) {
      return false;
    }
  }
  const arr1Map = new Map<string, T>();
  const arr2Map = new Map<string, T>();
  for (const item of arr1) {
    arr1Map.set(item.id, item);
  }
  for (const item of arr2) {
    arr2Map.set(item.id, item);
  }

  // ids are equal in both arrays
  for (const id of arr1Ids) {
    const obj1 = arr1Map.get(id);
    const obj2 = arr2Map.get(id);
    if (!obj1 || !obj2) {
      return false;
    }
    const isEqual = isObjectEqualForSimpleKeys(obj1, obj2);
    if (!isEqual) {
      return false;
    }
    const keys = Object.keys(obj1);
    for (const key of keys) {
      const value1 = obj1[key];
      const value2 = obj2[key];
      if (Array.isArray(value1) && Array.isArray(value2)) {
        const isEqual = isArrayOfObjectsEqual(value1, value2);
        if (!isEqual) {
          return false;
        }
      }
    }
  }
  return true;
}
