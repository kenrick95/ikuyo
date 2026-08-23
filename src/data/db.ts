import { init } from '@instantdb/core';
import schema from '../../instant.schema';
import { assertWritable, readOnlyMode } from './backendConfig';

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

// During the InstantDB → MySQL cutover the frontend is in read-only mode:
// reject every write at the single InstantDB write entry point so none of the
// domain `db.*` helpers can persist during the freeze window.
if (readOnlyMode) {
  // Capture the real implementation so the guard can forward once enabled again.
  const realTransact = db.transact;
  // The parameter/return types are inferred from the original method signature,
  // so this override stays assignable without spelling out the chunk type.
  db.transact = (chunks) => {
    void chunks;
    assertWritable('modifying or deleting data');
    return realTransact(chunks);
  };
}
