import type {
  DbAccommodation,
  DbAccommodationWithTrip,
} from '../Accommodation/db';
import type { DbActivity, DbActivityWithTrip } from '../Activity/db';
import type { DbCommentGroup, DbCommentGroupObjectType } from '../Comment/db';
import {
  deleteMutation,
  patchMutation,
  postMutation,
  putMutation,
} from '../data/apiClient';
import {
  optimisticPatchTrip,
  optimisticRemoveTrip,
  optimisticRun,
} from '../data/optimistic';
import type { DbUser } from '../data/types';
import type { DbMacroplan, DbMacroplanWithTrip } from '../Macroplan/db';
import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';
import type { TripSharingLevelType } from './tripSharingLevel';

export type DbTripFull = Omit<
  DbTrip,
  'activity' | 'accommodation' | 'macroplan' | 'commentGroup'
> & {
  accommodation: DbAccommodationWithTrip[];
  activity: DbActivityWithTrip[];
  macroplan: DbMacroplanWithTrip[];
  commentGroup: DbCommentGroup<DbCommentGroupObjectType>[];
};

export type DbTripWithAccommodation = Omit<DbTrip, 'accommodation'> & {
  accommodation: DbAccommodationWithTrip[];
};

export type DbTripWithMacroplan = Omit<DbTrip, 'macroplan'> & {
  macroplan: DbMacroplanWithTrip[];
};

export type DbTripWithActivity = Omit<DbTrip, 'activity'> & {
  activity: DbActivityWithTrip[];
};
export type DbTrip = {
  id: string;
  title: string;
  /** ms of day of the trip start */
  timestampStart: number;
  /** ms of day _after_ of trip end. This means the final full day of trip is one day before `timestampEnd` */
  timestampEnd: number;
  timeZone: string;
  /** destination 2-letter Intl region. Uppercase! */
  region: string;
  /** destination's default currency */
  currency: string;
  /** origin's default currency */
  originCurrency: string;
  /** origin 2-letter Intl region. Uppercase! Optional for backward compat */
  originRegion: string;
  /** origin's IANA time zone. Optional for backward compat */
  originTimeZone: string;

  /** 0: private; 1: group (removed, no longer in use); 2: public but unlisted; 3: public listed in public directory */
  sharingLevel: TripSharingLevelType;
  /** undefined = visible; false = hidden for public visitors */
  publicShowExpenses?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowTasks?: boolean;
  /** undefined = visible; false = hidden for public visitors */
  publicShowComments?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowExpenses?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowTasks?: boolean;
  /** undefined = visible; false = hidden for invited Viewers */
  viewerShowComments?: boolean;

  activity: DbActivity[] | undefined;
  accommodation: DbAccommodation[] | undefined;
  macroplan: DbMacroplan[] | undefined;

  tripUser: DbTripUser[] | undefined;
  commentGroup: DbCommentGroup<DbCommentGroupObjectType>[] | undefined;
};

export type DbTripUser = {
  id: string;

  createdAt: number;
  lastUpdatedAt: number;
  role: TripUserRole;

  trip: DbTrip[] | undefined;
  user: DbUser[] | undefined;
};

export async function dbAddTrip(
  newTrip: Omit<
    DbTrip,
    | 'id'
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'activity'
    | 'accommodation'
    | 'tripUser'
    | 'macroplan'
    | 'commentGroup'
  >,
  {
    userId: _userId,
  }: {
    userId: string;
  },
) {
  const result = await postMutation<{ id: string }>('/api/trips', newTrip);
  return { id: result.id, result };
}

export async function dbUpdateTrip(
  trip: Omit<
    DbTrip,
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'accommodation'
    | 'activity'
    | 'tripUser'
    | 'macroplan'
    | 'commentGroup'
  >,
) {
  return optimisticRun(
    ['trip'],
    () =>
      optimisticPatchTrip(trip.id, {
        title: trip.title,
        timestampStart: trip.timestampStart,
        timestampEnd: trip.timestampEnd,
        timeZone: trip.timeZone,
        region: trip.region,
        currency: trip.currency,
        originCurrency: trip.originCurrency,
        originRegion: trip.originRegion ?? '',
        originTimeZone: trip.originTimeZone ?? '',
      }),
    () => putMutation(`/api/trips/${encodeURIComponent(trip.id)}`, trip),
  );
}

export type TripDuplicateOptions = {
  title: string;
  /** ms of day of the new trip's start */
  startDateMs: number;
  /** ms of day _after_ of the new trip's end */
  endDateMs: number;
  includeActivities: boolean;
  includeMacroplans: boolean;
  includeAccommodations: boolean;
  includeExpenses: boolean;
  includeTasks: boolean;
  /** when true, copied activities have their dates removed (become undated) */
  removeActivityDates: boolean;
};

/**
 * Duplicate a trip into a new trip owned by `userId`.
 */
export async function dbDuplicateTrip(
  sourceTripId: string,
  options: TripDuplicateOptions,
  { userId: _userId }: { userId: string },
) {
  const result = await postMutation<{ id: string }>(
    `/api/trips/${encodeURIComponent(sourceTripId)}/duplicate`,
    options,
  );
  return { id: result.id, result };
}

export async function dbUpdateTripSharingLevel(
  tripId: string,
  sharingLevel: TripSharingLevelType,
) {
  return optimisticRun(
    ['trip'],
    () => optimisticPatchTrip(tripId, { sharingLevel }),
    () =>
      patchMutation(`/api/trips/${encodeURIComponent(tripId)}/sharing`, {
        sharingLevel,
      }),
  );
}

export async function dbDeleteTrip(trip: TripSliceTrip) {
  return optimisticRun(
    [
      'trip',
      'activity',
      'accommodation',
      'macroplan',
      'expense',
      'taskList',
      'task',
      'commentGroup',
      'comment',
      'tripUser',
    ],
    () => optimisticRemoveTrip(trip.id),
    () => deleteMutation(`/api/trips/${encodeURIComponent(trip.id)}`),
  );
}

export async function dbAddUserToTrip({
  tripId,
  userEmail,
  userRole,
}: {
  tripId: string;
  userEmail: string;
  userRole: TripUserRole;
}) {
  return postMutation(`/api/trips/${encodeURIComponent(tripId)}/members`, {
    email: userEmail,
    role: roleNumber(userRole),
  });
}

export async function dbUpdateUserFromTrip({
  tripId,
  userEmail,
  userRole,
}: {
  tripId: string;
  userEmail: string;
  previousUserRole: TripUserRole;
  userRole: TripUserRole;
}) {
  return postMutation(
    `/api/trips/${encodeURIComponent(tripId)}/members/update`,
    { email: userEmail, role: roleNumber(userRole) },
  );
}

export async function dbRemoveUserFromTrip(tripUserId: string) {
  return deleteMutation(`/api/members/${encodeURIComponent(tripUserId)}`);
}

function roleNumber(role: TripUserRole): number {
  return role === TripUserRole.Owner ? 0 : role === TripUserRole.Editor ? 1 : 2;
}

export async function dbUpdateTripSectionVisibility(
  tripId: string,
  fields: Partial<
    Pick<
      DbTrip,
      | 'publicShowExpenses'
      | 'publicShowTasks'
      | 'publicShowComments'
      | 'viewerShowExpenses'
      | 'viewerShowTasks'
      | 'viewerShowComments'
    >
  >,
): Promise<void> {
  await optimisticRun(
    ['trip'],
    () => optimisticPatchTrip(tripId, fields),
    () =>
      patchMutation(
        `/api/trips/${encodeURIComponent(tripId)}/sections`,
        fields,
      ),
  );
}
