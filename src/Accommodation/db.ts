import { id } from '@instantdb/core';
import type { DbTrip, DbTripWithAccommodation } from '../Trip/db';
import { db } from '../data/db';

export type DbAccommodationWithTrip = Omit<DbAccommodation, 'trip'> & {
  trip: DbTripWithAccommodation;
};

export type DbAccommodation = {
  id: string;
  name: string;
  address: string;
  /** ms */
  timestampCheckIn: number;
  /** ms */
  timestampCheckOut: number;
  phoneNumber: string;
  notes: string;

  createdAt: number;
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
};

export async function dbAddAccommodation(
  newAccommodation: Omit<
    DbAccommodation,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'
  >,
  {
    tripId,
  }: {
    tripId: string;
  },
) {
  const newAccommodationId = id();
  return {
    id: newAccommodationId,
    result: await db.transact([
      db.tx.accommodation[newAccommodationId]
        .update({
          ...newAccommodation,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          trip: tripId,
        }),
    ]),
  };
}

export async function dbUpdateAccommodation(
  accommodation: Omit<DbAccommodation, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return db.transact(
    db.tx.accommodation[accommodation.id].merge({
      ...accommodation,
      lastUpdatedAt: Date.now(),
    }),
  );
}

export async function dbDeleteAccommodation(accommodation: DbAccommodation) {
  return db.transact([db.tx.accommodation[accommodation.id].delete()]);
}
