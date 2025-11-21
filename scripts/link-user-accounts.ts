// Link users in "user" table with "$users" table by email
import 'dotenv/config';
import { init } from '@instantdb/admin';
import schema from '../instant.schema.ts';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID || '';
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || '';

interface UserEntity {
  id: string;
  email: string;
  handle: string;
  activated: boolean;
  createdAt: number;
  lastUpdatedAt: number;
}

interface InstantUser {
  id: string;
  email?: string | null;
}

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

  console.log('Starting migration: linking "user" and "$users" tables...\n');

  // Step 1: Fetch all users from the "user" table
  const { user: customUsers } = await db.query({
    user: {},
  });

  if (!customUsers || customUsers.length === 0) {
    console.log('No users found in "user" table. Migration complete.');
    return;
  }

  console.log(`Found ${customUsers.length} users in "user" table.\n`);

  // Step 2: Fetch all users from the "$users" table
  const { $users: instantUsers } = await db.query({
    $users: {},
  });

  if (!instantUsers || instantUsers.length === 0) {
    console.log('No users found in "$users" table. Migration complete.');
    return;
  }

  console.log(`Found ${instantUsers.length} users in "$users" table.\n`);

  // Step 3: Create a map of email -> $user for quick lookup
  const instantUsersByEmail = new Map<string, InstantUser>();
  for (const instantUser of instantUsers) {
    if (instantUser.email) {
      instantUsersByEmail.set(instantUser.email, instantUser as InstantUser);
    }
  }

  // Step 4: Link users by matching emails
  let linkedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const customUser of customUsers as UserEntity[]) {
    const instantUser = instantUsersByEmail.get(customUser.email);

    if (!instantUser) {
      console.log(
        `⚠️  Skipping user ${customUser.handle} (${customUser.email}) - no matching $user found`,
      );
      skippedCount++;
      continue;
    }

    try {
      // Check if already linked
      const existingLink = await db.query({
        user: {
          $: {
            where: {
              id: customUser.id,
            },
          },
          $users: {},
        },
      });

      if (existingLink.user?.[0]?.$users) {
        console.log(
          `⏭️  Skipping user ${customUser.handle} (${customUser.email}) - already linked`,
        );
        skippedCount++;
        continue;
      }

      // Create the link
      await db.transact([
        db.tx.user[customUser.id].link({
          $users: instantUser.id,
        }),
      ]);

      console.log(
        `✅ Linked user ${customUser.handle} (${customUser.email}) with $user ${instantUser.id}`,
      );
      linkedCount++;
    } catch (error) {
      console.error(
        `❌ Error linking user ${customUser.handle} (${customUser.email}):`,
        error,
      );
      errorCount++;
    }
  }

  // Step 5: Summary
  console.log('\n═══════════════════════════════════════');
  console.log('Migration Summary:');
  console.log('═══════════════════════════════════════');
  console.log(`Total users in "user" table: ${customUsers.length}`);
  console.log(`Total users in "$users" table: ${instantUsers.length}`);
  console.log(`Successfully linked: ${linkedCount}`);
  console.log(`Skipped (already linked or no match): ${skippedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('═══════════════════════════════════════\n');

  if (errorCount > 0) {
    console.log(
      '⚠️  Some errors occurred during migration. Please review the logs above.',
    );
    process.exit(1);
  } else if (linkedCount === 0) {
    console.log('ℹ️  No new links were created.');
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

main()
  .then(() => {
    console.log('\nScript execution finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
