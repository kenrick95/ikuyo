import { id, init } from '@instantdb/react';
import type {
  DbActivity,
  DbSchema,
  DbTrip,
  DbTripWithActivity,
  DbUser,
} from './types';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init<DbSchema>({ appId: APP_ID, devtool: false });

export async function dbAddActivity(
  newActivity: Omit<DbActivity, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  {
    tripId,
  }: {
    tripId: string;
  }
) {
  return db.transact(
    db.tx.activity[id()]
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
export async function dbDeleteActivity(activity: DbActivity) {
  return db.transact(db.tx.activity[activity.id].delete());
}
export async function dbUpdateActivity(
  activity: Omit<DbActivity, 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  return db.transact(
    db.tx.activity[activity.id].update({
      ...activity,
      lastUpdatedAt: Date.now(),
    })
  );
}
export async function dbAddTrip(
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
  const newId = id();
  return {
    id: newId,
    result: await db.transact([
      db.tx.trip[newId]
        .update({
          ...newTrip,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          user: [userId],
        }),
    ]),
  };
}
export async function dbAddUserToTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>,
  user: DbUser
) {
  return db.transact([
    db.tx.trip[trip.id]
      .update({
        ...trip,
        lastUpdatedAt: Date.now(),
      })
      .link({
        user: [user.id],
      }),
  ]);
}
export async function removeUserFromTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>,
  user: DbUser
) {
  return db.transact([
    db.tx.trip[trip.id]
      .update({
        ...trip,
        lastUpdatedAt: Date.now(),
      })
      .unlink({
        user: [user.id],
      }),
  ]);
}

export async function dbUpdateTrip(
  trip: Omit<DbTrip, 'createdAt' | 'lastUpdatedAt' | 'activity' | 'user'>
) {
  return db.transact(
    db.tx.trip[trip.id].update({
      ...trip,
      lastUpdatedAt: Date.now(),
    })
  );
}
export async function dbDeleteTrip(trip: DbTripWithActivity) {
  return db.transact([
    ...trip.activity.map((activity) => db.tx.activity[activity.id].delete()),
    db.tx.trip[trip.id].delete(),
  ]);
}

export async function dbAddUser(
  newUser: Omit<DbUser, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  return db.transact(
    db.tx.user[id()].update({
      ...newUser,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    })
  );
}
export async function dbUpdateUser(user: Omit<DbUser, 'trip'>) {
  return db.transact(
    db.tx.user[user.id].update({
      ...user,
      lastUpdatedAt: Date.now(),
    })
  );
}
