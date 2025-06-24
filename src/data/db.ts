import { init } from '@instantdb/core';
import schema from '../../instant.schema';

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
