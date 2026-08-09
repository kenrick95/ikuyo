// Backfill trips that are missing originRegion by deriving it from their originCurrency.
// For currencies shared by multiple regions, the first region in REGION_TO_CURRENCY_MAP wins.
import 'dotenv/config';
import { init } from '@instantdb/admin';
import schema from '../instant.schema.ts';
import { REGION_TO_CURRENCY_MAP } from '../src/data/intl/currencies';

const INSTANT_APP_ID = process.env.INSTANT_APP_ID || '';
const INSTANT_APP_ADMIN_TOKEN = process.env.INSTANT_APP_ADMIN_TOKEN || '';

// Reverse mapping: currency -> a representative region code (ISO 3166-1 alpha-2).
const CURRENCY_TO_REGION: Record<string, string> = {};
for (const [region, currency] of Object.entries(REGION_TO_CURRENCY_MAP)) {
  if (CURRENCY_TO_REGION[currency] === undefined) {
    CURRENCY_TO_REGION[currency] = region;
  }
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

  const { trip: trips } = await db.query({
    trip: {
      $: {
        fields: ['id', 'originCurrency', 'originRegion'],
      },
    },
  });

  let updated = 0;
  let skippedNoCurrency = 0;
  let skippedNoMatch = 0;
  let skippedAlreadySet = 0;

  for (const trip of trips || []) {
    if (trip.originRegion) {
      skippedAlreadySet += 1;
      continue;
    }
    const currency = trip.originCurrency;
    if (!currency) {
      skippedNoCurrency += 1;
      continue;
    }
    const region = CURRENCY_TO_REGION[currency];
    if (!region) {
      skippedNoMatch += 1;
      console.log(
        `No region found for currency "${currency}" (trip ${trip.id})`,
      );
      continue;
    }
    await db.transact([
      db.tx.trip[trip.id].merge({
        originRegion: region,
        lastUpdatedAt: Date.now(),
      }),
    ]);
    updated += 1;
    if (updated % 100 === 0) {
      console.log(`Updated ${updated} trips so far...`);
    }
  }

  console.log('Done.');
  console.log(`  updated:           ${updated}`);
  console.log(`  skipped (set):     ${skippedAlreadySet}`);
  console.log(`  skipped (no curr): ${skippedNoCurrency}`);
  console.log(`  skipped (no match): ${skippedNoMatch}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
