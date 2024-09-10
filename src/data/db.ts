import { id, init, tx } from '@instantdb/react';
import type { DbActivity, DbSchema, DbTrip, DbUser } from './types';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init<DbSchema>({ appId: APP_ID, devtool: false });

export function addActivity(
  newActivity: Omit<DbActivity, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  {
    trip,
  }: {
    trip: DbTrip;
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
        trip: [trip.id],
      })
  );
}
export function deleteActivity(activity: DbActivity) {
  db.transact(tx.activity[activity.id].delete());
}
export function updateActivity(
  activity: Omit<DbActivity, 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  db.transact(
    tx.activity[activity.id].update({
      ...activity,
      lastUpdatedAt: Date.now(),
    })
  );
}
export function addTrip(
  newTrip: Omit<
    DbTrip,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'
  >,
  user: DbUser
) {
  db.transact([
    tx.trip[id()]
      .update({
        ...newTrip,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        user: [user.id],
      }),
  ]);
}
export function addUserToTrip(
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

export function updateTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>
) {
  db.transact(
    tx.trip[trip.id].update({
      ...trip,
      lastUpdatedAt: Date.now(),
    })
  );
}
export function deleteTrip(trip: DbTrip) {
  db.transact(tx.trip[trip.id].delete());
}

export function addUser(
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
export function updateUser(user: Omit<DbUser, 'trip'>) {
  db.transact(
    tx.user[user.id].update({
      ...user,
      lastUpdatedAt: Date.now(),
    })
  );
}
