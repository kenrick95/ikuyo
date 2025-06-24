import { id } from '@instantdb/core';
import { db } from '../data/db';

export type DbUser = {
  id: string;
  handle: string;
  email: string;
  createdAt: number;
  lastUpdatedAt: number;
  activated: boolean;
};

export async function dbUpsertUser(
  newUser: Omit<DbUser, 'id' | 'createdAt' | 'lastUpdatedAt' | 'tripUser'>,
) {
  const { data: userData } = await db.queryOnce({
    user: {
      $: {
        where: {
          email: newUser.email,
        },
        limit: 1,
      },
    },
  });
  const user = userData.user[0] as undefined | Omit<DbUser, 'tripUser'>;
  let userId = user?.id;
  if (!userId) {
    // new user
    userId = id();
    return db.transact(
      db.tx.user[userId].update({
        ...newUser,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      }),
    );
  }
  // existing user
  return db.transact(
    db.tx.user[userId].update({
      ...newUser,
      lastUpdatedAt: Date.now(),
    }),
  );
}
