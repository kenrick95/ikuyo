import { id } from '@instantdb/core';
import type { DbCommentGroup } from '../Comment/db';
import { db } from '../data/db';
import type { DbTrip, DbTripWithActivity } from '../Trip/db';

export type DbActivityWithTrip = Omit<DbActivity, 'trip'> & {
  trip: DbTripWithActivity;
};

export type DbActivity = {
  id: string;
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
  /** ms */
  timestampStart: number | null | undefined;
  /** ms */
  timestampEnd: number | null | undefined;

  /** default: trip.timeZone */
  timeZoneStart: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneEnd: string | null | undefined;

  /** ms */
  createdAt: number;
  /** ms */
  lastUpdatedAt: number;

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
  return db.transact(
    db.tx.activity[id()]
      .update({
        ...newActivity,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        trip: tripId,
      }),
  );
}
export async function dbDeleteActivity(activityId: string) {
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
  return db.transact(
    db.tx.activity[activity.id].merge({
      ...activity,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbUpdateActivityTime(
  activityId: string,
  timestampStart: number,
  timestampEnd: number,
) {
  return db.transact(
    db.tx.activity[activityId].merge({
      timestampStart,
      timestampEnd,
      lastUpdatedAt: Date.now(),
    }),
  );
}
