import { id } from '@instantdb/core';
import { db } from '../data/db';
import type { DbTrip, DbTripWithAccommodation } from '../Trip/db';

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

  /** default: trip.timeZone */
  timeZoneCheckIn: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneCheckOut: string | null | undefined;

  phoneNumber: string;
  notes: string;

  locationLat: number | null | undefined;
  locationLng: number | null | undefined;
  locationZoom: number | null | undefined;

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
  const transaction = await db.transact([
    db.tx.accommodation[newAccommodationId]
      .update({
        ...newAccommodation,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        trip: tripId,
      }),
  ]);
  return {
    id: newAccommodationId,
    transaction,
    undo: async () => {
      return await db.transact(
        db.tx.accommodation[newAccommodationId].delete(),
      );
    },
  };
}

export async function dbUpdateAccommodation(
  accommodation: Omit<DbAccommodation, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  const snapshot = await db.queryOnce({
    accommodation: {
      $: {
        where: { id: accommodation.id },
      },
    },
  });
  const transaction = await db.transact(
    db.tx.accommodation[accommodation.id].merge({
      ...accommodation,
      lastUpdatedAt: Date.now(),
    }),
  );
  return {
    transaction,
    undo: async () => {
      return await db.transact(
        db.tx.accommodation[accommodation.id].merge({
          ...snapshot.data.accommodation[0],
          lastUpdatedAt: Date.now(),
        }),
      );
    },
  };
}

export async function dbDeleteAccommodation(accommodationId: string) {
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'accommodation',
          'object.accommodation.id': accommodationId,
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
    db.tx.accommodation[accommodationId].delete(),
  ]);
}
