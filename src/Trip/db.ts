import { type TransactionChunk, id, lookup } from '@instantdb/core';
import { DateTime } from 'luxon';
import type {
  DbAccommodation,
  DbAccommodationWithTrip,
} from '../Accommodation/db';
import type { DbActivity, DbActivityWithTrip } from '../Activity/db';
import { TripUserRole } from '../data/TripUserRole';
import { db } from '../data/db';
import type { DbUser } from '../data/types';

export type DbTripWithActivityAccommodation = Omit<
  DbTrip,
  'activity' | 'accommodation'
> & {
  accommodation: DbAccommodationWithTrip[];
  activity: DbActivityWithTrip[];
};

export type DbTripWithAccommodation = Omit<DbTrip, 'accommodation'> & {
  accommodation: DbAccommodationWithTrip[];
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
  /** destination's default currency */
  currency: string;
  /** origin's default currency */
  originCurrency: string;

  activity: DbActivity[] | undefined;
  accommodation: DbAccommodation[] | undefined;

  tripUser: DbTripUser[] | undefined;
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
  >,
  {
    userId,
  }: {
    userId: string;
  },
) {
  const newTripId = id();
  const newTripUserId = id();
  return {
    id: newTripId,
    result: await db.transact([
      db.tx.trip[newTripId].update({
        ...newTrip,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      }),
      db.tx.tripUser[newTripUserId]
        .update({
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          role: TripUserRole.Owner,
        })
        .link({
          user: userId,
          trip: newTripId,
        }),
    ]),
  };
}
export async function dbUpdateTrip(
  trip: Omit<
    DbTrip,
    'createdAt' | 'lastUpdatedAt' | 'accommodation' | 'activity' | 'tripUser'
  >,
  {
    previousTimeZone,
    activities,
  }: {
    previousTimeZone: string;
    activities?: DbActivity[];
  },
) {
  const tripId = trip.id;

  const transactionTimestamp = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [
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
        }),
      );
    }
  }

  return db.transact(transactions);
}
export async function dbDeleteTrip(trip: DbTripWithActivityAccommodation) {
  return db.transact([
    ...trip.activity.map((activity) => db.tx.activity[activity.id].delete()),
    ...trip.accommodation.map((accommodation) =>
      db.tx.accommodation[accommodation.id].delete(),
    ),
    db.tx.trip[trip.id].delete(),
  ]);
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
  const lastUpdatedAt = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [];

  const { data: userData } = await db.queryOnce({
    user: {
      $: {
        where: {
          email: userEmail,
        },
        limit: 1,
      },
    },
  });

  const user = userData.user[0] as undefined | Omit<DbUser, 'tripUser'>;

  let userId = user?.id;
  if (!userId) {
    // New user
    userId = id();
    const defaultHandle = userEmail.toLowerCase().replace(/[@.]/g, '_');
    transactions.push(
      db.tx.user[userId].update({
        handle: defaultHandle,
        email: userEmail,
        activated: false,
        createdAt: lastUpdatedAt,
        lastUpdatedAt: lastUpdatedAt,
      }),
    );
  }

  const { data: tripUserData } = await db.queryOnce({
    tripUser: {
      $: {
        where: {
          'trip.id': tripId,
          'user.email': userEmail,
        },
        limit: 1,
      },
    },
  });
  const tripUser = tripUserData.tripUser[0] as
    | undefined
    | Omit<DbTripUser, 'trip' | 'user'>;

  let tripUserId = tripUser?.id;
  if (!tripUserId) {
    // New TripUser entity: create new row, and link to Trip & User
    tripUserId = id();
    transactions.push(
      db.tx.tripUser[tripUserId]
        .update({
          createdAt: lastUpdatedAt,
          lastUpdatedAt: lastUpdatedAt,
          role: userRole,
        })
        .link({
          trip: tripId,
          user: userId,
        }),
    );
  } else {
    // Existing TripUser entity, just update the "row" column
    transactions.push(
      db.tx.tripUser[tripUserId].update({
        lastUpdatedAt: lastUpdatedAt,
        role: userRole,
      }),
    );
  }

  return db.transact(transactions);
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
  const lastUpdatedAt = Date.now();
  // biome-ignore lint/suspicious/noExplicitAny: The type should be generic
  const transactions: TransactionChunk<any, any>[] = [];

  const { data: tripUserData } = await db.queryOnce({
    tripUser: {
      $: {
        where: {
          'trip.id': tripId,
          'user.email': userEmail,
        },
        limit: 1,
      },
    },
  });
  const tripUser = tripUserData.tripUser[0] as
    | undefined
    | Omit<DbTripUser, 'trip' | 'user'>;
  let tripUserId = tripUser?.id;

  if (!tripUserId) {
    // New TripUser entity: create new row, and link to Trip & User
    tripUserId = id();
    transactions.push(
      db.tx.tripUser[tripUserId]
        .update({
          createdAt: lastUpdatedAt,
          lastUpdatedAt: lastUpdatedAt,
          role: userRole,
        })
        .link({
          trip: tripId,
          user: lookup('email', userEmail),
        }),
    );
  } else {
    // Existing TripUser entity, just update the "row" column
    transactions.push(
      db.tx.tripUser[tripUserId].update({
        lastUpdatedAt: lastUpdatedAt,
        role: userRole,
      }),
    );
  }

  return db.transact(transactions);
}
export async function dbRemoveUserFromTrip({
  tripId,
  userEmail,
}: {
  tripId: string;
  userEmail: string;
}) {
  const { data: tripUserData } = await db.queryOnce({
    tripUser: {
      $: {
        where: {
          'trip.id': tripId,
          'user.email': userEmail,
        },
        limit: 1,
      },
    },
  });
  const tripUser = tripUserData.tripUser[0] as
    | undefined
    | Omit<DbTripUser, 'trip' | 'user'>;

  const tripUserId = tripUser?.id;
  if (!tripUserId) {
    return;
  }

  return db.transact([db.tx.tripUser[tripUserId].delete()]);
}
