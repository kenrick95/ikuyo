import { id, init, tx } from '@instantdb/react';
import type { DbActivity, DbSchema, DbTrip, DbUser } from './types';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init<DbSchema>({ appId: APP_ID, devtool: false });

export function dbAddActivity(
  newActivity: Omit<DbActivity, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  {
    tripId,
  }: {
    tripId: string;
  }
) {
  db.transact(
    tx.activity[id()]
      .update({
        ...newActivity,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        trip: [tripId],
      })
  );
}
export function dbDeleteActivity(activity: DbActivity) {
  db.transact(tx.activity[activity.id].delete());
}
export function dbUpdateActivity(
  activity: Omit<DbActivity, 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  db.transact(
    tx.activity[activity.id].update({
      ...activity,
      lastUpdatedAt: Date.now(),
    })
  );
}
export function dbAddTrip(
  newTrip: Omit<
    DbTrip,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'
  >,
  {
    userId,
  }: {
    userId: string;
  }
) {
  db.transact([
    tx.trip[id()]
      .update({
        ...newTrip,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        user: [userId],
      }),
  ]);
}
export function dbAddUserToTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>,
  user: DbUser
) {
  db.transact([
    tx.trip[trip.id]
      .update({
        ...trip,
        lastUpdatedAt: Date.now(),
      })
      .link({
        user: [user.id],
      }),
  ]);
}
export function removeUserFromTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>,
  user: DbUser
) {
  db.transact([
    tx.trip[trip.id]
      .update({
        ...trip,
        lastUpdatedAt: Date.now(),
      })
      .unlink({
        user: [user.id],
      }),
  ]);
}

export function dbUpdateTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>
) {
  db.transact(
    tx.trip[trip.id].update({
      ...trip,
      lastUpdatedAt: Date.now(),
    })
  );
}
export function dbDeleteTrip(trip: DbTrip) {
  db.transact(tx.trip[trip.id].delete());
}

export function dbAddUser(
  newUser: Omit<DbUser, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  db.transact(
    tx.user[id()].update({
      ...newUser,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    })
  );
}
export function dbUpdateUser(user: Omit<DbUser, 'trip'>) {
  db.transact(
    tx.user[user.id].update({
      ...user,
      lastUpdatedAt: Date.now(),
    })
  );
}
