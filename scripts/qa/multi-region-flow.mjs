// Browser checks against a local Ikuyo build with fictional API data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const toolsDir = process.env.IKUYO_QA_TOOLS_DIR || process.cwd();
const { chromium } = createRequire(path.resolve(toolsDir, 'package.json'))(
  'playwright',
);
const base = process.env.IKUYO_QA_URL || 'http://127.0.0.1:5199';
const output =
  process.env.IKUYO_QA_OUTPUT || 'docs/screenshots/multi-region-trip';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.IKUYO_QA_BROWSER,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 940 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
  locale: 'en-SG',
});
page.setDefaultTimeout(8000);
await page.clock.setFixedTime(new Date('2026-05-03T06:00:00Z'));
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

const user = {
  id: 'mock-user',
  handle: 'alex',
  email: 'alex@example.test',
  activated: true,
  preferredRegion: 'SG',
  preferredCurrency: 'SGD',
  preferredTimeZone: 'Asia/Singapore',
};
const taipei = {
  id: '15d2ddfb-3061-46a1-9004-41acb07e3a10',
  name: 'Taipei',
  region: 'TW',
  timeZone: 'Asia/Taipei',
  currency: 'TWD',
  startsOn: '2026-05-06',
  startsAtTime: '15:40',
  startsAtMs: Date.parse('2026-05-06T15:40:00+08:00'),
};
const activity = (
  id,
  title,
  start,
  end,
  timeZoneStart,
  timeZoneEnd = timeZoneStart,
  props = {},
) => ({
  id,
  title,
  timeZoneStart,
  timeZoneEnd,
  timestampStart: Date.parse(start),
  timestampEnd: Date.parse(end),
  description: '',
  createdAt: 1,
  lastUpdatedAt: 1,
  ...props,
});
let trip = {
  id: 'mock-tokyo-taipei',
  title: 'Tokyo and Taipei',
  region: 'JP',
  currency: 'JPY',
  originCurrency: 'SGD',
  originRegion: 'SG',
  originTimeZone: 'Asia/Singapore',
  timeZone: 'Asia/Tokyo',
  timestampStart: Date.parse('2026-05-03T00:00:00+09:00'),
  timestampEnd: Date.parse('2026-05-09T00:00:00+09:00'),
  destinations: [taipei],
  destinationRevision: 2,
  sharingLevel: 0,
  activity: [
    activity(
      'asakusa',
      'Senso-ji',
      '2026-05-03T10:00+09:00',
      '2026-05-03T12:00+09:00',
      'Asia/Tokyo',
      'Asia/Tokyo',
      { icon: '⛩️', location: 'Asakusa' },
    ),
    activity(
      'ramen',
      'Late-night ramen',
      '2026-05-06T00:30+09:00',
      '2026-05-06T01:30+09:00',
      'Asia/Tokyo',
      'Asia/Tokyo',
      { icon: '🍜', location: 'Shinjuku' },
    ),
    activity(
      'flight',
      'Flight to Taipei',
      '2026-05-06T13:20+09:00',
      '2026-05-06T15:40+08:00',
      'Asia/Tokyo',
      'Asia/Taipei',
      {
        flags: 4,
        icon: '✈️',
        location: 'Tokyo Haneda',
        locationDestination: 'Taipei Songshan',
      },
    ),
    activity(
      'market',
      'Raohe Night Market',
      '2026-05-06T18:00+08:00',
      '2026-05-06T20:00+08:00',
      'Asia/Taipei',
      'Asia/Taipei',
      { icon: '🏮', location: 'Songshan' },
    ),
    activity(
      'park',
      'Daan Forest Park',
      '2026-05-07T10:00+08:00',
      '2026-05-07T12:00+08:00',
      'Asia/Taipei',
      'Asia/Taipei',
      { icon: '🌳', location: 'Taipei' },
    ),
  ],
  accommodation: [],
  macroplan: [],
  expense: [],
  people: [
    {
      id: 'alex',
      name: 'Alex',
      userId: user.id,
      isParticipant: true,
      accountType: 'registered',
      hasAccount: true,
      handle: 'alex',
    },
  ],
  expenseLedger: {
    currencies: [],
    payments: [],
    splitCount: 0,
    expenseCount: 0,
  },
  taskList: [],
  tripUser: [{ id: 'mock-member', role: 0, user }],
  commentGroup: [],
};
const tripUrl = `/trip/${trip.id}`;
let submitted;
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== base) return route.abort();
  if (!url.pathname.startsWith('/api/')) return route.continue();
  const respond = (json, status = 200) => route.fulfill({ status, json });
  const method = route.request().method();
  if (url.pathname === '/api/auth/me')
    return respond({ user, registrationEnabled: true });
  if (url.pathname === '/api/csrf-token')
    return respond({ token: 'mock-token' });
  if (url.pathname === '/api/sync')
    return respond({ changes: [], nextCursor: 1 });
  if (url.pathname === '/api/trips' && method === 'POST') {
    submitted = route.request().postDataJSON();
    return respond({ id: trip.id }, 201);
  }
  if (url.pathname === `/api/trips/${trip.id}`) {
    if (method === 'PUT') {
      trip = {
        ...trip,
        ...route.request().postDataJSON(),
        destinationRevision: trip.destinationRevision + 1,
      };
    }
    return respond(trip);
  }
  if (url.pathname.startsWith('/api/users/me')) return respond({ user });
  return respond({ data: [] });
});

const shot = (filename) =>
  page.screenshot({
    path: path.join(output, filename),
    animations: 'disabled',
  });
const select = async (label, option) => {
  await page.getByRole('combobox', { name: label }).click();
  await page
    .getByRole('option', { name: option, exact: typeof option === 'string' })
    .click();
};
async function pickDate(trigger, date, hour, minute) {
  await trigger.click();
  await page.locator(`button[data-date="${date}"]`).click();
  if (hour !== undefined)
    await page.getByLabel(`${hour} o'clock`, { exact: true }).click();
  if (minute !== undefined)
    await page.getByLabel(`${minute} minutes`, { exact: true }).click();
  await page.getByRole('button', { name: 'OK', exact: true }).click();
}

try {
  await page.goto(`${base}/trip/new`);
  await page.getByRole('textbox').first().fill('Tokyo and Taipei');
  await select('Destination Region / Country', 'Japan');
  await pickDate(
    page.getByRole('button', { name: /Trip start date:/i }),
    '2026-05-03',
  );
  await pickDate(
    page.getByRole('button', { name: /Trip end date:/i }),
    '2026-05-08',
  );
  await page.getByRole('button', { name: 'Add another destination' }).click();
  await select('Region', 'Taiwan');
  await page.getByLabel('Place', { exact: true }).fill('Taipei');
  await pickDate(
    page.getByRole('button', { name: /Destination start date:/ }),
    '2026-05-06',
  );
  await page.getByLabel('Time (optional)', { exact: true }).fill('15:40');
  await shot('01-destination-editor.png');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await shot('02-wizard-destinations.png');
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'Create Trip' }).click();
  await page.waitForURL((url) => url.pathname.startsWith(tripUrl));
  assert.equal(submitted.destinations[0].name, 'Taipei');
  assert.equal(submitted.destinations[0].currency, 'TWD');

  await page.goto(`${base + tripUrl}/list`);
  await page.getByText('Late-night ramen').waitFor();
  await select('Display time zone', 'Asia/Taipei');
  await page
    .getByRole('button', { name: /23:?30.*Late-night ramen/ })
    .waitFor();
  await page.getByRole('combobox', { name: 'Display time zone' }).click();
  await shot('03-list-time-zone.png');
  await page.keyboard.press('Escape');

  await page.goto(`${base + tripUrl}/timetable`);
  assert.equal(
    await page
      .getByRole('combobox', { name: 'Display time zone' })
      .textContent(),
    'Asia/Taipei',
  );
  await page.getByText('15:40 · Taipei', { exact: true }).waitFor();
  await shot('04-timetable.png');

  const slot = Date.parse('2026-05-05T23:00:00+08:00');
  await page.locator(`[data-time-slot="${slot}"]`).scrollIntoViewIfNeeded();
  await page
    .locator(`[data-grid-cell][data-instant="${slot}"]`)
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'New activity' }).click();
  const newActivity = page.getByRole('dialog');
  await newActivity
    .getByRole('button', { name: /6 May 2026 00:00/ })
    .first()
    .waitFor();
  assert.equal(
    await newActivity.locator('[id="timeZoneStart"]').textContent(),
    'Asia/Tokyo',
  );
  await page.goto(`${base + tripUrl}/timetable`);

  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit trip' }).click();
  await page.getByRole('button', { name: 'Edit Taipei' }).click();
  await select('Use arrival', /Flight to Taipei · Taipei Songshan/);
  assert.equal(
    await page.getByLabel('Time (optional)', { exact: true }).inputValue(),
    '15:40',
  );
  await page
    .getByLabel('Time (optional)', { exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole('combobox', { name: 'Use arrival' })
    .locator('xpath=../../..')
    .screenshot({
      path: path.join(output, '06-use-arrival.png'),
      animations: 'disabled',
    });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(trip.destinations[0].startsAtTime, '15:40');

  await page.setViewportSize({ width: 390, height: 840 });
  await page.goto(`${base + tripUrl}/expenses`);
  await page.getByRole('button', { name: 'Add Expense' }).click();
  await pickDate(
    page.getByRole('button', { name: /Date incurred:/i }),
    '2026-05-07',
    12,
    30,
  );
  await page
    .getByRole('textbox', { name: /^Title/ })
    .fill('Lunch at Yongkang Street');
  assert.equal(
    await page.getByRole('combobox', { name: 'Currency' }).textContent(),
    'TWD',
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Time zone' }).textContent(),
    'Asia/Taipei',
  );
  await shot('05-mobile-expense.png');
  await page
    .getByRole('textbox', { name: 'Amount *', exact: true })
    .fill('180');
  await pickDate(
    page.getByRole('button', { name: /Date incurred:/i }),
    '2026-05-04',
    12,
    30,
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Currency' }).textContent(),
    'TWD',
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Time zone' }).textContent(),
    'Asia/Tokyo',
  );
  await page.getByRole('textbox', { name: 'Amount *', exact: true }).clear();
  await pickDate(
    page.getByRole('button', { name: /Date incurred:/i }),
    '2026-05-05',
    12,
    30,
  );
  assert.equal(
    await page.getByRole('combobox', { name: 'Currency' }).textContent(),
    'JPY',
  );
  assert.deepEqual(errors, []);
  console.log(
    'Wizard, arrival, display zone, cross-midnight entry, and expense defaults verified.',
  );
} finally {
  await browser.close();
}
