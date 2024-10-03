import { id, init_experimental, lookup } from '@instantdb/react';
import type { DbActivity, DbTrip, DbTripWithActivity, DbUser } from './types';
import { DateTime } from 'luxon';
import schema from '../../instant.schema';
import { TripUserRole } from './TripUserRole';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init_experimental({ schema, appId: APP_ID, devtool: false });

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
        trip: tripId,
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
    db.tx.activity[activity.id].merge({
      ...activity,
      lastUpdatedAt: Date.now(),
    })
  );
}
export async function dbAddTrip(
  newTrip: Omit<
    DbTrip,
    | 'id'
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'activity'
    | 'user'
    | 'owner'
    | 'editor'
    | 'viewer'
  >,
  {
    userId,
  }: {
    userId: string;
  }
) {
  const newTripId = id();
  return {
    id: newTripId,
    result: await db.transact([
      db.tx.trip[newTripId]
        .update({
          ...newTrip,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          owner: [userId],
        }),
    ]),
  };
}
export async function dbUpdateTrip(
  trip: Omit<
    DbTrip,
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'activity'
    | 'user'
    | 'owner'
    | 'editor'
    | 'viewer'
  >,
  {
    previousTimeZone,
    activities,
  }: {
    previousTimeZone: string;
    activities?: DbActivity[];
  }
) {
  const tripId = trip.id;

  const transactionTimestamp = Date.now();
  const transactions = [
    db.tx.trip[tripId].merge({
      ...trip,
      lastUpdatedAt: transactionTimestamp,
    }),
  ];

  if (previousTimeZone !== trip.timeZone && activities) {
    // Time zone changed, so need to migrate all activities to new time zone to "preserve" time relative to each day
    for (const activity of activities) {
      transactions.push(
        db.tx.activity[activity.id].merge({
          timestampStart: DateTime.fromMillis(activity.timestampStart, {
            zone: previousTimeZone,
          })
            .setZone(trip.timeZone, {
              keepLocalTime: true,
            })
            .toMillis(),
          timestampEnd: DateTime.fromMillis(activity.timestampEnd, {
            zone: previousTimeZone,
          })
            .setZone(trip.timeZone, {
              keepLocalTime: true,
            })
            .toMillis(),
          lastUpdatedAt: transactionTimestamp,
        })
      );
    }
  }

  return db.transact(transactions);
}
export async function dbDeleteTrip(trip: DbTripWithActivity) {
  return db.transact([
    ...trip.activity.map((activity) => db.tx.activity[activity.id].delete()),
    db.tx.trip[trip.id].delete(),
  ]);
}

export async function dbAddUserToTrip({
  tripId,
  newUser,
  userEmail,
  userRole,
}: {
  tripId: string;
  newUser: undefined | DbUser;
  userEmail: undefined | string;
  userRole: TripUserRole;
}) {
  const lastUpdatedAt = Date.now();
  const transactions = [];

  // TODO: if there is a 'queryOnce', I can create the user here if needed, for now have to do useQuery I guess..

  let userId = newUser?.id;
  if (!userId) {
    userId = id();
    transactions.push(
      db.tx.user[userId].update({
        handle: userEmail,
        email: userEmail,
        activated: false,
        createdAt: lastUpdatedAt,
        lastUpdatedAt: lastUpdatedAt,
      })
    );
  }

  transactions.push(
    db.tx.trip[tripId].link({
      [userRole]: userId,
    })
  );
  for (const role of [
    TripUserRole.Owner,
    TripUserRole.Editor,
    TripUserRole.Viewer,
  ]) {
    if (userRole === role) {
      continue;
    }

    transactions.push(
      db.tx.trip[tripId].unlink({
        [role]: userId,
      })
    );
  }

  return db.transact(transactions);
}
export async function dbUpdateUserFromTrip({
  tripId,
  userEmail,
  previousUserRole,
  userRole,
}: {
  tripId: string;
  userEmail: undefined | string;
  previousUserRole: TripUserRole;
  userRole: TripUserRole;
}) {
  return db.transact([
    db.tx.trip[tripId].unlink({
      [previousUserRole]: lookup('email', userEmail),
    }),
    db.tx.trip[tripId].link({
      [userRole]: lookup('email', userEmail),
    }),
  ]);
}
export async function dbRemoveUserFromTrip({
  tripId,
  userEmail,
  userRole,
}: {
  tripId: string;
  userEmail: undefined | string;
  userRole: TripUserRole;
}) {
  return db.transact(
    db.tx.trip[tripId].unlink({
      [userRole]: lookup('email', userEmail),
    })
  );
}

export async function dbUpsertUser(
  newUser: Omit<
    DbUser,
    | 'id'
    | 'createdAt'
    | 'lastUpdatedAt'
    | 'trip'
    | 'tripOwner'
    | 'tripEditor'
    | 'tripViewer'
  >
) {
  return db.transact(
    db.tx.user[lookup('email', newUser.email)].merge({
      ...newUser,
      // TODO: need a query once to check if need to update createAt or not...
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    })
  );
}
