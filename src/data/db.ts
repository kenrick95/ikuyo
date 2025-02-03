import { id, init } from '@instantdb/react';
import type { DbUser } from './types';

import schema from '../../instant.schema';

// ID for app: ikuyo
const INSTANT_APP_ID = process.env.INSTANT_APP_ID;

if (!INSTANT_APP_ID) {
  throw new Error('process.env.INSTANT_APP_ID not set');
}

export const db = init({ schema, appId: INSTANT_APP_ID, devtool: false });

export async function dbUpsertUser(
  newUser: Omit<DbUser, 'id' | 'createdAt' | 'lastUpdatedAt' | 'tripUser'>
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
      })
    );
  } else {
    // existing user
    return db.transact(
      db.tx.user[userId].update({
        ...newUser,
        lastUpdatedAt: Date.now(),
      })
    );
  }
}
