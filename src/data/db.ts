import { init } from '@instantdb/react';
import type { DbSchema } from './types';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init<DbSchema>({ appId: APP_ID });
