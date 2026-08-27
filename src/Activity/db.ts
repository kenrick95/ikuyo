import { id } from '@instantdb/core';
import type { DbCommentGroup } from '../Comment/db';
import { deleteMutation, postMutation, putMutation } from '../data/apiClient';
import { backendActivityWrites } from '../data/backendConfig';
import { db } from '../data/db';
import {
  optimisticActivityPatch,
  optimisticActivityRemove,
  optimisticActivityUpsert,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbTrip, DbTripWithActivity } from '../Trip/db';
import type { TripSliceActivity } from '../Trip/store/types';
import { ActivityFlag, updateActivityFlag } from './activityFlag';

export type DbActivityWithTrip = Omit<DbActivity, 'trip'> & {
  trip: DbTripWithActivity;
};

export type DbActivity = {
  id: string;
  /** Optional explicit itinerary day-plan/macroplan membership. */
  dayPlanId?: string | null;
  planningStatus?: string | null;
  title: string;
  location: string;
  /** undefined/null means not set, 0 means somewhere! */
  locationLat: undefined | null | number;
  /** undefined/null means not set, 0 means somewhere! */
  locationLng: undefined | null | number;
  /** Default zoom of the map, if undefined will be default to 9 */
  locationZoom: undefined | null | number;

  /** Some activity is about going from A to B. If so, 'location' fields are origin, and 'locationDestination' fields are destination */
  locationDestination: undefined | null | string;
  /** undefined/null means not set, 0 means somewhere! */
  locationDestinationLat: undefined | null | number;
  /** undefined/null means not set, 0 means somewhere! */
  locationDestinationLng: undefined | null | number;
  /** Default zoom of the map, if undefined will be default to 9 */
  locationDestinationZoom: undefined | null | number;

  description: string;
  /** ms; possible to be as early as trip.timestampStart - 1d */
  timestampStart: number | null | undefined;
  /** ms; possible to be up to but not after trip.timestampEnd + 1d */
  timestampEnd: number | null | undefined;

  /** default: trip.timeZone */
  timeZoneStart: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneEnd: string | null | undefined;

  /** ms */
  createdAt: number;
  /** ms */
  lastUpdatedAt: number;

  /** bitmask, check ActivityFlag */
  flags?: number | null | undefined;

  /** emoji */
  icon?: string | null | undefined;

  trip: DbTrip | undefined;

  commentGroup?: DbCommentGroup<'activity'>;
};

export async function dbAddActivity(
  newActivity: Omit<DbActivity, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  {
    tripId,
  }: {
    tripId: string;
  },
) {
  if (backendActivityWrites) {
    // Optimistic: insert locally with a client-generated id, send the same id so
    // the server persists it, and roll back on failure.
    const newId = id();
    return optimisticRun(
      ['activity', 'trip'],
      () => {
        const now = Date.now();
        optimisticActivityUpsert(tripId, {
          ...newActivity,
          id: newId,
          createdAt: now,
          lastUpdatedAt: now,
          tripId,
          commentGroupId: undefined,
        } as TripSliceActivity);
      },
      async () => {
        const result = await postMutation<{ id: string }>(
          `/api/trips/${encodeURIComponent(tripId)}/activities`,
          { ...newActivity, id: newId },
        );
        return {
          transaction: result,
          id: result.id,
          undo: async () =>
            deleteMutation(
              `/api/trips/${encodeURIComponent(tripId)}/activities/${encodeURIComponent(result.id)}`,
            ),
        };
      },
    );
  }

  const newId = id();
  const transaction = await db.transact(
    db.tx.activity[newId]
      .create({
        ...newActivity,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        trip: tripId,
      }),
  );

  return {
    transaction,
    id: newId,
    undo: async () => {
      return await db.transact(db.tx.activity[newId].delete());
    },
  };
}
export async function dbDeleteActivity(activityId: string) {
  if (backendActivityWrites) {
    const state = useBoundStore.getState();
    const activity = state.activity[activityId];
    const tripId = activity?.tripId;
    return optimisticRun(
      ['activity', 'trip'],
      () => {
        if (tripId) optimisticActivityRemove(tripId, activityId);
      },
      () => deleteMutation(`/api/activities/${encodeURIComponent(activityId)}`),
    );
  }
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'activity',
          'object.activity.id': activityId,
        },
        fields: ['id'],
      },
    },
  });
  const commentGroupIds = commentGroups.data.commentGroup.map(
    (commentGroup) => commentGroup.id,
  );
  const commentIds = commentGroups.data.commentGroup.flatMap((commentGroup) =>
    commentGroup.comment.map((comment) => comment.id),
  );
  // TODO: change to soft delete so we can easily undo
  return db.transact([
    ...commentGroupIds.map((commentGroupId) =>
      db.tx.commentGroup[commentGroupId].delete(),
    ),
    ...commentGroupIds.map((commentGroupId) =>
      // CommentGroupObject has same id as commentGroup
      db.tx.commentGroupObject[commentGroupId].delete(),
    ),
    ...commentIds.map((commentId) => db.tx.comment[commentId].delete()),
    db.tx.activity[activityId].delete(),
  ]);
}
export async function dbUpdateActivity(
  activity: Omit<DbActivity, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  if (backendActivityWrites) {
    return optimisticRun(
      ['activity'],
      () => optimisticActivityPatch(activity.id, activity),
      async () => {
        const result = await putMutation<DbActivity>(
          `/api/activities/${encodeURIComponent(activity.id)}`,
          activity,
        );
        return { transaction: result, undo: async () => undefined };
      },
    );
  }

  const snapshot = await db.queryOnce({
    activity: {
      $: {
        where: { id: activity.id },
      },
    },
  });

  const transaction = await db.transact(
    db.tx.activity[activity.id].merge({
      ...activity,
      lastUpdatedAt: Date.now(),
    }),
  );

  return {
    transaction,
    undo: async () => {
      return await db.transact(
        db.tx.activity[activity.id].merge({
          ...snapshot.data.activity[0],
          lastUpdatedAt: Date.now(),
        }),
      );
    },
  };
}

export async function dbDuplicateActivityDragEnd(
  activityId: string,
  {
    timestampStart,
    timestampEnd,
  }: {
    timestampStart: number;
    timestampEnd: number;
  },
) {
  if (backendActivityWrites) {
    const state = useBoundStore.getState();
    const activity = state.activity[activityId];
    const tripId = activity?.tripId;
    const newId = id();
    return optimisticRun(
      ['activity', 'trip'],
      () => {
        if (tripId && activity) {
          optimisticActivityUpsert(tripId, {
            ...activity,
            id: newId,
            timestampStart,
            timestampEnd,
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
            flags: updateActivityFlag(
              activity.flags,
              ActivityFlag.IsIdea,
              false,
            ),
          });
        }
      },
      async () => {
        const result = await postMutation<{ id: string }>(
          `/api/activities/${encodeURIComponent(activityId)}/duplicate`,
          { timestampStart, timestampEnd, id: newId },
        );
        return {
          id: result.id,
          transaction: result,
          undo: async () =>
            deleteMutation(`/api/activities/${encodeURIComponent(result.id)}`),
        };
      },
    );
  }
  const res = await db.queryOnce({
    activity: {
      $: {
        where: { id: activityId },
      },
      trip: {
        $: {
          fields: ['id'],
        },
      },
    },
  });
  const activity = res.data.activity[0];
  if (!activity) {
    throw new Error(`Activity with id ${activityId} not found`);
  }
  const tripId = activity?.trip?.id;
  if (!tripId) {
    throw new Error(`Activity with id ${activityId} has no trip`);
  }
  delete activity.trip;
  const newId = id();
  const transaction = await db.transact(
    db.tx.activity[newId]
      .create({
        ...activity,
        timestampStart,
        timestampEnd,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        flags: updateActivityFlag(activity.flags, ActivityFlag.IsIdea, false),
      })
      .link({
        trip: tripId,
      }),
  );
  return {
    id: newId,
    transaction,
    undo: async () => {
      return await db.transact(db.tx.activity[newId].delete());
    },
  };
}

export async function dbUpdateActivityDragEnd(
  activityId: string,
  {
    timestampStart,
    timestampEnd,
  }: {
    timestampStart: number;
    timestampEnd: number;
  },
) {
  if (backendActivityWrites) {
    return optimisticRun(
      ['activity'],
      () => {
        const existing = useBoundStore.getState().activity[activityId];
        optimisticActivityPatch(activityId, {
          timestampStart,
          timestampEnd,
          flags: updateActivityFlag(
            existing?.flags,
            ActivityFlag.IsIdea,
            false,
          ),
          lastUpdatedAt: Date.now(),
        });
      },
      async () => {
        const result = await postMutation<DbActivity>(
          `/api/activities/${encodeURIComponent(activityId)}/drag-end`,
          { timestampStart, timestampEnd },
        );
        return { transaction: result, undo: async () => undefined };
      },
    );
  }
  const res = await db.queryOnce({
    activity: {
      $: {
        where: { id: activityId },
      },
    },
  });
  const activitySnapshot = res.data.activity[0];
  if (!activitySnapshot) {
    throw new Error(`Activity with id ${activityId} not found`);
  }
  const transaction = await db.transact(
    db.tx.activity[activitySnapshot.id].merge({
      timestampStart,
      timestampEnd,
      lastUpdatedAt: Date.now(),
      flags: updateActivityFlag(
        activitySnapshot.flags,
        ActivityFlag.IsIdea,
        false,
      ),
    }),
  );
  return {
    transaction,
    undo: async () => {
      return await db.transact(
        db.tx.activity[activitySnapshot.id].merge({
          ...activitySnapshot,
          lastUpdatedAt: Date.now(),
        }),
      );
    },
  };
}
