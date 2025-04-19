import { id } from '@instantdb/core';
import type { DbTrip, DbTripWithActivity } from '../Trip/db';
import { db } from '../data/db';

export type DbActivityWithTrip = Omit<DbActivity, 'trip'> & {
  trip: DbTripWithActivity;
};

export type DbActivity = {
  id: string;
  title: string;
  location: string;
  description: string;
  /** ms */
  timestampStart: number;
  /** ms */
  timestampEnd: number;
  createdAt: number;
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
