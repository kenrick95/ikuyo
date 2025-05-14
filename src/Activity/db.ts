import { id } from '@instantdb/core';
import { db } from '../data/db';
import type { DbTrip, DbTripWithActivity } from '../Trip/db';

export type DbActivityWithTrip = Omit<DbActivity, 'trip'> & {
  trip: DbTripWithActivity;
};

export type DbActivity = {
  id: string;
  title: string;
  location: string;
  /** undefined means not set, 0 means somewhere! */
  locationLat: undefined | number;
  /** undefined means not set, 0 means somewhere! */
  locationLng: undefined | number;
  /** Default zoom of the map, if undefined will be default to 9 */
  locationZoom: undefined | number;

  description: string;
  /** ms */
  timestampStart: number;
  /** ms */
  timestampEnd: number;
  /** ms */
  createdAt: number;
  /** ms */
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
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
export async function dbDeleteActivity(activity: DbActivity) {
  return db.transact(db.tx.activity[activity.id].delete());
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
