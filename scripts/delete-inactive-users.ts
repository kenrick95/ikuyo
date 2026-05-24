// Fetch list of users, check for last activity, and delete those empty ones (never associated with any trip or comment) that have been inactive for a certain period of time.
import 'dotenv/config';
import { init } from '@instantdb/admin';
import schema from '../instant.schema.ts';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID || '';
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || '';

const INACTIVITY_THRESHOLD = 1000 * 60 * 60 * 24 * 180; // 180 days

async function main() {
  if (!INSTANT_APP_ID) {
    throw new Error('INSTANT_APP_ID is required');
  }
  if (!INSTANT_APP_ADMIN_TOKEN) {
    throw new Error('INSTANT_APP_ADMIN_TOKEN is required');
  }

  const db = init({
    appId: INSTANT_APP_ID,
    adminToken: INSTANT_APP_ADMIN_TOKEN,
    schema,
  });

  // Step 1: Fetch all users from the "user" table
  const { user: customUsers } = await db.query({
    user: {
      tripUser: {},
      comment: {},
      $users: {},
    },
  });

  for (const user of customUsers || []) {
    const lastLoginAt = user.lastLoginAt || 0;
    const lastUpdatedAt = user.lastUpdatedAt || 0;
    const lastActivity = Math.max(lastLoginAt, lastUpdatedAt);
    const inactivityDuration = Date.now() - lastActivity;

    if (inactivityDuration <= INACTIVITY_THRESHOLD) {
      console.log(
        `Skipping user ${user.id} (${user.handle}) due to recent activity`,
      );
      continue; // User is still active, skip deletion
    }

    if (user.comment.length > 0 || user.tripUser.length > 0) {
      console.log(
        `Skipping user ${user.id} (${user.handle}) due to existing associations (comments: ${user.comment.length}, tripUser: ${user.tripUser.length})`,
      );
      continue;
    }

    const mainUser = user.$users;

    if (!mainUser) {
      // This case shouldn't happen since we link $users when creating a user, but just in case, we won't delete the user if we can't find the linked $users record
      console.log(
        `Skipping user ${user.id} (${user.handle}) due to missing linked $users record`,
      );
      continue;
    }

    if (inactivityDuration > INACTIVITY_THRESHOLD) {
      console.log(`Deleting user ${user.id} (${user.handle})`);
      await db.transact([
        db.tx.$users[mainUser.id].delete(),
        db.tx.user[user.id].delete(),
      ]);
    }
  }
}
main();
