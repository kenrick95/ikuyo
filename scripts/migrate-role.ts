// Migrate roles from trip.viewer, trip.editor, trip.owner to tripUser.role
import 'dotenv/config';
import { init, id } from '@instantdb/admin';
import schema from '../instant.schema.ts';
const INSTANT_APP_ID = process.env.INSTANT_APP_ID || '';
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || '';

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

  const allUsers = await db.query({
    user: {
      // @ts-expect-error Removed from schema
      tripEditor: {},
      tripOwner: {},
      tripViewer: {},
    },
  }); 
  for (const user of allUsers.user || []) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const tripEditor = (user as any).tripEditor || [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const tripOwner = (user as any).tripOwner || [];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    const tripViewer = (user as any).tripViewer || [];
    for (const trip of  tripEditor) {
      const tripUserId = id(); 
      await db.transact([
        db.tx.tripUser[tripUserId]
          .update({
            role: 'editor',
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
          })
          .link({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            trip: trip.id,
            user: user.id,
          }),
      ]);
    } 
    for (const trip of  tripOwner) {
      const tripUserId = id(); 
      await db.transact([
        db.tx.tripUser[tripUserId]
          .update({
            role: 'owner',
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
          })
          .link({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            trip: trip.id,
            user: user.id,
          }),
      ]);
    }

    for (const trip of  tripViewer) {
      const tripUserId = id(); 
      await db.transact([
        db.tx.tripUser[tripUserId]
          .update({
            role: 'viewer',
            createdAt: Date.now(),
            lastUpdatedAt: Date.now(),
          })
          .link({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            trip: trip.id,
            user: user.id,
          }),
      ]);
    }
  }
}
main().catch(() => {
  process.exit(1);
});
