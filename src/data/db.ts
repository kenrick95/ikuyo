import { id, init } from '@instantdb/core';
import schema from '../../instant.schema';
import type { DbUser } from './types';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID;
const INSTANT_API_URI = process.env.INSTANT_API_URI;
const INSTANT_WEBSOCKET_URI = process.env.INSTANT_WEBSOCKET_URI;

if (!INSTANT_APP_ID) {
  throw new Error('process.env.INSTANT_APP_ID not set');
}

const additionalConfig: {
  apiURI?: string;
  websocketURI?: string;
} = {};

if (INSTANT_API_URI) {
  additionalConfig.apiURI = INSTANT_API_URI;
}
if (INSTANT_API_URI) {
  additionalConfig.websocketURI = INSTANT_WEBSOCKET_URI;
}

export const db = init({
  schema,
  appId: INSTANT_APP_ID,
  devtool: false,
  ...additionalConfig,
});

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
