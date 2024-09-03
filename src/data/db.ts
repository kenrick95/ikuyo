import { id, init, tx } from '@instantdb/react';
import type { DbActivity, DbSchema } from './types';

// ID for app: ikuyo
const APP_ID = '6962735b-d61f-4c3c-a78f-03ca3fa6ba9a';

export const db = init<DbSchema>({ appId: APP_ID, devtool: false });

export function addActivity(newActivity: Omit<DbActivity, 'id'>) {
  db.transact(
    tx.activities[id()].update({
      ...newActivity,
      createdAt: Date.now(),
      lastUpdatedAt: Date.now(),
    })
  );
}
export function deleteActivity(activity: DbActivity) {
  db.transact(tx.activities[activity.id].delete());
}
export function updateActivity(activity: DbActivity) {
  db.transact(
    tx.activities[activity.id].update({
      ...activity,
      lastUpdatedAt: Date.now(),
    })
  );
}
