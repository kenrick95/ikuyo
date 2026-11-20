// Run against a local build. All API requests use fictional in-memory fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  path.join(
    process.env.IKUYO_QA_TOOLS_DIR ||
      path.dirname(fileURLToPath(import.meta.url)),
    'package.json',
  ),
);
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const base = process.env.IKUYO_QA_URL || 'http://127.0.0.1:5174';
const output = path.resolve(
  process.env.IKUYO_QA_OUTPUT || 'docs/screenshots/expense-splitting',
);
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.IKUYO_QA_BROWSER || undefined,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 1040 },
  colorScheme: 'light',
  reducedMotion: 'reduce',
  locale: 'en-SG',
});
const page = await context.newPage();
const reports = [],
  checks = [],
  unexpected = [],
  errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const stamp = Date.parse('2026-11-16T04:00:00Z');
await page.clock.setFixedTime(new Date(stamp));
const user = {
  id: 'mock-user-alex',
  handle: 'alex',
  email: 'alex@example.test',
  activated: true,
  role: 'user',
  createdAt: stamp,
  lastUpdatedAt: stamp,
};
const people = [
  {
    id: 'a',
    name: 'Alex',
    userId: user.id,
    handle: 'alex',
    hasAccount: true,
    accountType: 'registered',
    isParticipant: true,
    accessRole: 0,
    archived: false,
  },
  {
    id: 'b',
    name: 'Bea',
    userId: null,
    handle: null,
    hasAccount: false,
    accountType: null,
    isParticipant: true,
    accessRole: null,
    archived: false,
  },
  {
    id: 'c',
    name: 'Chen',
    userId: null,
    handle: null,
    hasAccount: false,
    accountType: null,
    isParticipant: true,
    accessRole: null,
    archived: false,
  },
  {
    id: 'd',
    name: 'Morgan',
    userId: 'mock-guest-account',
    handle: 'guest_account',
    hasAccount: true,
    accountType: 'guest',
    isParticipant: false,
    accessRole: 1,
    archived: false,
  },
];
const expenses = [],
  payments = [],
  history = [];
const minor = (amount, currency) =>
  Math.round(Number(amount) * (currency === 'JPY' ? 1 : 100));
function ledger(input, amount, currency) {
  if (!input) return null;
  const paidBy = input.paidBy === 'me' ? 'a' : input.paidBy;
  const total = minor(amount, currency);
  const shares = input.shares || [];
  let allocations = [];
  if (input.method) {
    const weights = shares.map((row) =>
      input.method === 'equal' ? 1 : Number(row.value || 0),
    );
    const sum = weights.reduce((a, b) => a + b, 0);
    allocations = shares.map((row, i) => ({
      participantId: row.participantId,
      amountMinor: String(
        input.method === 'exact'
          ? minor(row.value, currency)
          : Math.floor((total * weights[i]) / sum),
      ),
    }));
    let left =
      total - allocations.reduce((n, row) => n + Number(row.amountMinor), 0);
    for (const row of allocations)
      if (left-- > 0) row.amountMinor = String(Number(row.amountMinor) + 1);
  }
  return {
    ...input,
    paidBy,
    contributions:
      paidBy === 'multiple'
        ? input.contributions
        : [{ participantId: paidBy, amountMinor: String(total) }],
    allocations,
  };
}
function addExpense(title, amount, currency, paidBy, shared = true) {
  const entry = {
    id: `mock-expense-${expenses.length + 1}`,
    title,
    description: '',
    amount,
    currency,
    timestampIncurred: stamp,
    timeZoneIncurred: 'Asia/Singapore',
    createdAt: stamp,
    lastUpdatedAt: stamp,
    currencyConversionFactor: currency === 'SGD' ? 1 : undefined,
    amountInOriginCurrency: currency === 'SGD' ? amount : undefined,
    ledger_revision: 1,
  };
  entry.ledger = ledger(
    {
      paidBy,
      method: shared ? 'equal' : null,
      shares: shared
        ? people
            .filter((p) => p.isParticipant)
            .map((p) => ({ participantId: p.id }))
        : [],
    },
    amount,
    currency,
  );
  expenses.push(entry);
}
addExpense('Dinner at Lau Pa Sat', 90, 'SGD', 'a');
addExpense('Tokyo rail passes', 9000, 'JPY', 'b');
addExpense('Coffee', 12, 'SGD', 'a', false);
function snapshot() {
  const nets = {};
  const add = (c, id, n) => {
    nets[c] ??= {};
    nets[c][id] = (nets[c][id] || 0) + n;
  };
  for (const entry of expenses) {
    if (!entry.ledger?.method) continue;
    const sign = entry.ledger.kind === 'refund' ? -1 : 1;
    entry.ledger.contributions.forEach((row) => {
      add(entry.currency, row.participantId, sign * Number(row.amountMinor));
    });
    entry.ledger.allocations.forEach((row) => {
      add(entry.currency, row.participantId, -sign * Number(row.amountMinor));
    });
  }
  for (const payment of payments)
    if (!payment.voided) {
      add(payment.currency, payment.senderId, Number(payment.amountMinor));
      add(payment.currency, payment.recipientId, -Number(payment.amountMinor));
    }
  const currencies = Object.entries(nets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, net]) => {
      const debtors = Object.entries(net)
        .filter(([, n]) => n < 0)
        .map(([id, n]) => ({ id, n: -n }));
      const creditors = Object.entries(net)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => ({ id, n }));
      const suggestions = [];
      for (const debtor of debtors)
        for (const creditor of creditors) {
          const n = Math.min(debtor.n, creditor.n);
          if (n) {
            suggestions.push({
              senderId: debtor.id,
              recipientId: creditor.id,
              amountMinor: String(n),
            });
            debtor.n -= n;
            creditor.n -= n;
          }
        }
      return {
        currency,
        balances: Object.entries(net).map(([participantId, n]) => ({
          participantId,
          amountMinor: String(n),
        })),
        suggestions,
      };
    });
  return {
    currencies,
    payments,
    splitCount: expenses.filter((e) => e.ledger?.method).length,
    expenseCount: expenses.length,
  };
}
function trip() {
  return {
    id: 'mock-friends-trip',
    title: 'Singapore + Tokyo',
    region: 'SG',
    currency: 'SGD',
    originCurrency: 'SGD',
    originRegion: 'SG',
    timeZone: 'Asia/Singapore',
    timestampStart: stamp,
    timestampEnd: stamp + 5 * 86400000,
    sharingLevel: 0,
    createdAt: stamp,
    lastUpdatedAt: Date.now(),
    activity: [],
    accommodation: [],
    macroplan: [],
    expense: expenses,
    people,
    expenseLedger: snapshot(),
    taskList: [],
    tripUser: [
      {
        id: 'mock-member-alex',
        role: 0,
        user: { ...user, accountType: 'registered' },
      },
      {
        id: 'mock-member-morgan',
        role: 1,
        user: {
          id: 'mock-guest-account',
          handle: 'guest_account',
          email: null,
          accountType: 'guest',
          activated: true,
        },
      },
    ],
    commentGroup: [],
  };
}
await page.route('**/*', async (route) => {
  const url = new URL(route.request().url());
  if (url.origin !== new URL(base).origin) return route.abort();
  if (!url.pathname.startsWith('/api/')) return route.continue();
  const method = route.request().method(),
    body = route.request().postDataJSON() || {};
  const respond = (value, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(value),
    });
  if (url.pathname === '/api/auth/me')
    return respond({ user, registrationEnabled: true });
  if (url.pathname === '/api/csrf-token')
    return respond({ token: 'mock-csrf-token' });
  if (url.pathname === '/api/sync')
    return respond({ changes: [], nextCursor: 1 });
  if (url.pathname === '/api/trips/mock-friends-trip' && method === 'GET')
    return respond(trip());
  if (url.pathname.endsWith('/expense-history'))
    return respond({ items: history, nextCursor: null });
  if (url.pathname.endsWith('/people/lookup'))
    return respond({
      user:
        body.identity === '@new_guest'
          ? { id: 'mock-new-guest-account', handle: 'new_guest' }
          : body.identity === '@morgan'
            ? { id: 'mock-user-morgan', handle: 'morgan' }
            : null,
    });
  if (url.pathname.endsWith('/people') && method === 'POST') {
    people.push({
      id: body.id,
      name: body.name || 'Morgan',
      userId: body.userId || null,
      handle: body.userId ? 'morgan' : null,
      hasAccount: !!body.userId,
      accountType: body.userId ? 'registered' : null,
      isParticipant: body.isParticipant ?? true,
      accessRole: null,
      archived: false,
    });
    return respond({ id: body.id }, 201);
  }
  if (method === 'PATCH' && /\/people\/[^/]+$/.test(url.pathname)) {
    const person = people.find((p) => p.id === url.pathname.split('/').at(-1));
    assert(person, 'Unknown mock person');
    Object.assign(person, body);
    if ('userId' in body)
      Object.assign(person, {
        hasAccount: !!body.userId,
        handle: body.userId ? 'new_guest' : null,
        accountType: body.userId ? 'guest' : null,
      });
    return respond({ id: person.id });
  }
  if (url.pathname.endsWith('/expense-payments') && method === 'POST') {
    payments.push({ ...body, voided: false });
    history.unshift({
      id: history.length + 1,
      operation: 'payment.create',
      createdAt: stamp,
      changes: [
        {
          field: 'Payment',
          before: '',
          after: `${people.find((p) => p.id === body.senderId)?.name} → ${people.find((p) => p.id === body.recipientId)?.name}`,
        },
      ],
    });
    return respond({ id: body.id }, 201);
  }
  if (url.pathname.endsWith('/expenses') && method === 'POST') {
    const entry = {
      ...body,
      ledger: ledger(body.ledger, body.amount, body.currency),
      createdAt: stamp + expenses.length,
      lastUpdatedAt: stamp,
      ledger_revision: 1,
    };
    expenses.push(entry);
    return respond(entry, 201);
  }
  unexpected.push(`${method} ${url.pathname}`);
  return respond(
    { message: `Unexpected mock endpoint: ${method} ${url.pathname}` },
    404,
  );
});
async function textContrast() {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const rgba = (color) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const over = (front, back) => {
      const a = front[3] / 255;
      return front
        .slice(0, 3)
        .map((n, i) => n * a + back[i] * (1 - a))
        .concat(255);
    };
    const luminance = (rgb) =>
      rgb
        .slice(0, 3)
        .map((n) => {
          const s = n / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
    const scope =
      [...document.querySelectorAll('[role="dialog"]')]
        .filter((el) => !el.closest('[aria-hidden="true"]'))
        .at(-1) || document.body;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const failures = [],
      skipped = [];
    let checked = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent.trim(),
        el = node.parentElement;
      if (
        text.length < 2 ||
        !el ||
        el.closest(
          '[aria-hidden="true"], [hidden], [inert], :disabled, [aria-disabled="true"], script, style',
        )
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect(),
        style = getComputedStyle(el);
      if (
        !rect.width ||
        !rect.height ||
        style.visibility !== 'visible' ||
        style.display === 'none'
      )
        continue;
      const ancestors = [];
      for (let parent = el; parent; parent = parent.parentElement)
        ancestors.unshift(parent);
      let background = [255, 255, 255, 255],
        unsupported = false;
      for (const parent of ancestors) {
        const css = getComputedStyle(parent);
        if (css.backgroundImage !== 'none') unsupported = true;
        background = over(rgba(css.backgroundColor), background);
      }
      if (unsupported) {
        skipped.push(text.slice(0, 80));
        continue;
      }
      const foreground = over(rgba(style.color), background);
      const l1 = luminance(foreground),
        l2 = luminance(background);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      const size = parseFloat(style.fontSize),
        weight = parseInt(style.fontWeight, 10);
      const minimum = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;
      checked++;
      if (ratio + 0.02 < minimum)
        failures.push({
          text: text.slice(0, 100),
          ratio: Number(ratio.toFixed(2)),
          minimum,
          color: style.color,
          background: background.slice(0, 3).map(Math.round),
          fontSize: size,
        });
    }
    return { checked, failures, skipped };
  });
}

async function audit(name) {
  const report = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  reports.push({
    name,
    engine: report.testEngine,
    contrast: await textContrast(),
    violations: report.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      help: v.help,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        html: n.html,
        summary: n.failureSummary,
      })),
    })),
    incomplete: report.incomplete.map((v) => ({
      id: v.id,
      nodes: v.nodes.length,
    })),
  });
  console.log(`${name}: ${report.violations.length} accessibility violations`);
}
async function capture(name) {
  if (
    [
      '15-mobile-inline-split',
      '16-narrow-inline-split',
      '17-narrow-share-split',
    ].includes(name)
  ) {
    const fields = page
      .getByRole('region', { name: 'Expense split', exact: true })
      .locator('..');
    await fields.evaluate((element) =>
      element.scrollIntoView({ block: 'center' }),
    );
    await fields.screenshot({
      path: path.join(output, `${name}.png`),
      animations: 'disabled',
    });
    return;
  }
  if (
    [
      '03-people-picker',
      '04-balances',
      '05-partial-settlement',
      '06-cross-currency-settlement',
      '11-trip-people',
      '12-link-account',
      '14-trip-sharing',
    ].includes(name)
  ) {
    await page
      .getByRole('dialog')
      .first()
      .screenshot({
        path: path.join(output, `${name}.png`),
        animations: 'disabled',
      });
    return;
  }
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: !(await page
      .getByRole('dialog')
      .first()
      .isVisible()
      .catch(() => false)),
    animations: 'disabled',
  });
}

async function checkPeopleGrid() {
  assert(
    await page.getByRole('dialog').evaluate((dialog) => {
      const table = dialog.querySelector('table');
      if (!table || table.scrollWidth > table.clientWidth + 1) return false;
      const headers = [...table.querySelectorAll('thead th')].filter(
        (cell) => getComputedStyle(cell).display !== 'none',
      );
      return [...table.querySelectorAll('thead tr, tbody tr')].every((row) => {
        const cells = [...row.children].filter(
          (cell) => getComputedStyle(cell).display !== 'none',
        );
        return cells.every((cell, index) => {
          const bounds = cell.getBoundingClientRect();
          const header = headers[index].getBoundingClientRect();
          return (
            Math.abs(bounds.left - header.left) < 1 &&
            Math.abs(bounds.width - header.width) < 1 &&
            cell.scrollWidth <= cell.clientWidth + 1
          );
        });
      });
    }),
    'People cells must align with their columns and fit without horizontal scrolling',
  );
}

async function checkSplitGrid() {
  const region = page.getByRole('region', {
    name: 'Expense split',
    exact: true,
  });
  const choose = await region
    .getByRole('button', { name: 'Choose people' })
    .boundingBox();
  const method = await region
    .getByRole('combobox', { name: 'Split method:' })
    .boundingBox();
  const bounds = await region.boundingBox();
  assert(
    bounds.width <= 640,
    'Split controls should have a bounded reading width',
  );
  assert(
    Math.abs(choose.x + choose.width - method.x - method.width) < 1,
    'Split controls should share a right edge',
  );
  assert(
    await region.evaluate((section) => {
      if (section.scrollWidth > section.clientWidth + 1) return false;
      return [...section.querySelectorAll('li')].every((row) => {
        const amount = row.lastElementChild;
        return (
          row.scrollWidth <= row.clientWidth + 1 &&
          Math.abs(
            amount.getBoundingClientRect().right -
              row.getBoundingClientRect().right,
          ) < 1
        );
      });
    }),
    'Split names and amounts should fit with aligned right edges',
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Split form should fit the viewport',
  );
}

try {
  await page.goto(`${base}/trip/mock-friends-trip/expenses`);
  await page.getByRole('button', { name: 'Balances', exact: true }).waitFor();
  await audit('expenses-overview');
  await capture('01-expenses-overview');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await audit('trip-people');
  await checkPeopleGrid();
  await capture('11-trip-people');
  assert(await page.getByText('No account', { exact: true }).count());
  assert(await page.getByText('Guest account', { exact: true }).count());
  const joining = page.getByRole('checkbox', {
    name: 'Morgan is joining the trip',
  });
  assert.equal(await joining.isChecked(), false);
  await joining.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Morgan is joining the trip"]')
        ?.getAttribute('aria-checked') === 'true',
  );
  await joining.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[aria-label="Morgan is joining the trip"]')
        ?.getAttribute('aria-checked') === 'false',
  );
  assert.equal(people.find((p) => p.id === 'd').accessRole, 1);
  await page.getByRole('button', { name: 'Actions for Chen' }).click();
  await page
    .getByRole('menuitem', { name: 'Link account', exact: true })
    .click();
  await page
    .getByPlaceholder('Name, Ikuyo email or @username')
    .fill('@new_guest');
  await page.getByRole('button', { name: 'Find', exact: true }).click();
  await page.getByRole('button', { name: 'Link', exact: true }).waitFor();
  await audit('trip-person-link');
  await capture('12-link-account');
  await page.getByRole('button', { name: 'Link', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-state="open"] [role="checkbox"]')
        .length >= 4,
  );
  assert.equal(people.find((p) => p.id === 'c').id, 'c');
  assert.equal(people.find((p) => p.id === 'c').accessRole, null);
  checks.push(
    'Linking a guest account preserves the person ID and grants no access; joining does not change existing access',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Morgan' }).click();
  await page.getByRole('menuitem', { name: 'Share', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Sharing & Privacy for Trip' })
    .waitFor();
  assert.equal(
    await page
      .getByRole('textbox', { name: 'Account to share with' })
      .inputValue(),
    '@guest_account',
  );
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'Also add to participants' })
      .isChecked(),
    false,
  );
  assert.equal(
    await page
      .getByRole('checkbox', { name: 'guest_account is joining the trip' })
      .isChecked(),
    false,
  );
  await audit('trip-sharing');
  await capture('14-trip-sharing');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  checks.push(
    'People opens Sharing with a guest account selected and Joining independent of account access',
  );
  await page.getByRole('button', { name: 'Add Expense', exact: true }).click();
  await page.locator('input[name="title"]').fill('Hotel deposit');
  await page.locator('input[name="amount"]').fill('120');
  await page
    .getByRole('switch', { name: 'Split expense', exact: true })
    .click();
  await audit('inline-split');
  await checkSplitGrid();
  await capture('02-inline-split');
  await page.setViewportSize({ width: 1920, height: 1040 });
  await checkSplitGrid();
  await page.setViewportSize({ width: 390, height: 844 });
  await audit('mobile-inline-split');
  await checkSplitGrid();
  await capture('15-mobile-inline-split');
  await page.setViewportSize({ width: 320, height: 800 });
  await audit('mobile-320-inline-split');
  await checkSplitGrid();
  await capture('16-narrow-inline-split');
  for (const [option, state] of [
    ['By exact amounts', 'exact'],
    ['By percentage', 'percent'],
    ['By shares', 'shares'],
  ]) {
    await page.getByRole('combobox', { name: 'Split method:' }).click();
    await page.getByRole('option', { name: option, exact: true }).click();
    if (state === 'exact')
      await page
        .getByRole('textbox', { name: 'Alex share', exact: true })
        .fill('120');
    await audit(`mobile-320-split-${state}`);
    await checkSplitGrid();
    assert.equal(
      await page
        .getByRole('list', { name: 'Split amounts' })
        .getByRole('listitem')
        .count(),
      3,
      'Each person should have one allocation row',
    );
  }
  await capture('17-narrow-share-split');
  await page.getByRole('combobox', { name: 'Split method:' }).click();
  await page.getByRole('option', { name: 'Equally', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 1040 });
  checks.push(
    'Split controls and amount rows align at 320px, 390px, 1280px, and 1920px; all four methods fit on narrow screens',
  );
  await page
    .getByRole('button', { name: 'Choose people', exact: true })
    .click();
  await page.getByPlaceholder('Name, Ikuyo email or @username').fill('Dana');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByLabel('Include Dana', { exact: true }).waitFor();
  await audit('people-picker');
  await capture('03-people-picker');
  const dialog = page.getByRole('dialog');
  await page.keyboard.press('Tab');
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    assert(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
      'Focus escaped people dialog',
    );
  }
  checks.push('People picker traps Tab focus');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(
    () => document.activeElement?.textContent?.trim() === 'Choose people',
  );
  assert(
    await page
      .getByRole('button', { name: 'Choose people', exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  checks.push(
    'Escape restores focus to Choose people and keeps the expense draft',
  );
  assert.equal(
    await page.locator('input[name="title"]').inputValue(),
    'Hotel deposit',
  );
  await page
    .getByRole('button', { name: 'Choose people', exact: true })
    .click();
  await page.getByLabel('Include Dana', { exact: true }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('input[name="title"]').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: 'Balances', exact: true }).click();
  await audit('balances');
  await capture('04-balances');
  // SGD suggestions follow the JPY group. Pick Bea -> Alex in the SGD group.
  const settleButtons = page.getByRole('button', {
    name: 'Settle',
    exact: true,
  });
  await settleButtons.nth(2).click();
  await page
    .getByRole('textbox', { name: 'Amount · SGD', exact: true })
    .fill('20');
  await audit('partial-settlement');
  await capture('05-partial-settlement');
  await page.getByRole('button', { name: /^Date:/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('grid', { name: /^Calendar for/ }).waitFor();
  await audit('settlement-calendar');
  await capture('10-settlement-calendar');
  await page
    .getByRole('gridcell', { name: 'November 16, 2026', exact: true })
    .focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-label'),
    ),
    'November 17, 2026',
  );
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  await page.getByRole('grid').waitFor({ state: 'hidden' });
  await page.waitForFunction(() =>
    document.activeElement?.getAttribute('aria-label')?.startsWith('Date:'),
  );
  checks.push(
    'Shared settlement date picker supports Enter, arrow-key selection and confirmation',
  );
  await page
    .getByRole('button', { name: 'Record payment', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Balances', exact: true }).waitFor();
  assert.equal(payments.at(-1).amountMinor, '2000');
  checks.push(
    'Partial SGD payment updates the mock ledger without affecting JPY',
  );
  await page
    .getByRole('button', { name: 'Settle', exact: true })
    .first()
    .click();
  await page
    .getByRole('checkbox', { name: 'Paid in another currency', exact: true })
    .check();
  await page.getByRole('combobox').last().click();
  await page.getByRole('option', { name: 'SGD', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Amount paid · SGD', exact: true })
    .fill('30');
  await audit('cross-currency-settlement');
  await capture('06-cross-currency-settlement');
  await page
    .getByRole('button', { name: 'Record payment', exact: true })
    .click();
  await page.getByRole('heading', { name: 'Balances', exact: true }).waitFor();
  assert.equal(payments.at(-1).currency, 'JPY');
  assert.equal(payments.at(-1).paidCurrency, 'SGD');
  checks.push(
    'Cross-currency settlement retains debt currency and actual payment currency',
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: /Dinner at Lau Pa Sat/ }).click();
  await page
    .getByRole('button', { name: 'Record refund', exact: true })
    .click();
  await page.locator('input[name="amount"]').fill('30');
  await audit('refund');
  await capture('07-refund');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Dinner at Lau Pa Sat/ }).click();
  await audit('mobile-overview');
  await capture('08-mobile-overview');
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Mobile viewport has horizontal overflow',
  );
  checks.push('390px layout has no horizontal page overflow');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await audit('mobile-trip-people');
  await checkPeopleGrid();
  await capture('13-mobile-trip-people');
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Mobile people dialog has horizontal overflow',
  );
  await page.getByRole('button', { name: 'Actions for Morgan' }).click();
  await audit('trip-person-actions');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Balances', exact: true }).click();
  await audit('mobile-balances');
  await capture('09-mobile-balances');
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    'Mobile dialog has horizontal overflow',
  );
  checks.push('Mobile balances dialog fits the viewport');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 320, height: 800 });
  await audit('mobile-320-overview');
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    '320px layout has horizontal overflow',
  );
  checks.push('320px layout has no horizontal page overflow');
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await audit('mobile-320-trip-people');
  await checkPeopleGrid();
  const morganActions = page.getByRole('button', {
    name: 'Actions for Morgan',
  });
  await morganActions.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Rename', exact: true })
    .press('Enter');
  const renameInput = page.getByRole('textbox', { name: 'Name for Morgan' });
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute('aria-label') === 'Name for Morgan',
  );
  await renameInput.fill('Morgan with a longer display name');
  await audit('mobile-320-person-rename');
  await checkPeopleGrid();
  await page
    .getByRole('button', { name: 'Cancel', exact: true })
    .press('Enter');
  assert(
    await morganActions.evaluate((button) => button === document.activeElement),
  );
  const peopleDialog = page.getByRole('dialog');
  assert.equal(
    await peopleDialog
      .getByRole('button', { name: 'Cancel', exact: true })
      .count(),
    0,
  );
  await morganActions.press('Enter');
  await page
    .getByRole('menuitem', { name: 'Rename', exact: true })
    .press('Enter');
  await renameInput.fill('Morgan Updated');
  await peopleDialog
    .getByRole('button', { name: 'Save', exact: true })
    .press('Enter');
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute('aria-label') ===
      'Actions for Morgan Updated',
  );
  await peopleDialog
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  checks.push(
    'People columns align while renaming, and keyboard focus returns to Actions after Save or Cancel',
  );
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page
    .getByRole('button', { name: 'Actions for Morgan Updated' })
    .click();
  await page.getByRole('menuitem', { name: 'Share', exact: true }).click();
  const removeAccess = page.getByRole('button', {
    name: 'Remove',
    exact: true,
  });
  const removeBounds = await removeAccess.boundingBox();
  assert(
    removeBounds && removeBounds.x + removeBounds.width <= 320,
    'Sharing keeps Remove inside the viewport',
  );
  assert(
    await peopleDialog.evaluate(
      (dialog) => dialog.scrollWidth <= dialog.clientWidth + 1,
    ),
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  checks.push('Sharing keeps row actions visible at 320px');

  people.find((person) => person.id === 'c').name =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(3);
  await page.reload();
  await page.getByRole('button', { name: 'Balances', exact: true }).click();
  assert(
    await peopleDialog.evaluate((dialog) => {
      const bounds = dialog.getBoundingClientRect();
      return (
        bounds.left >= 0 &&
        bounds.right <= innerWidth &&
        dialog.scrollWidth <= dialog.clientWidth + 1
      );
    }),
    'Balances fits the viewport with long participant names',
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  checks.push('Balances wraps long participant names at 320px');
  await page.setViewportSize({ width: 1280, height: 1040 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() =>
    document.body.classList.contains('dark-theme'),
  );
  await page.waitForFunction(() =>
    document.querySelector('.radix-themes')?.classList.contains('dark'),
  );
  await page.waitForFunction(
    () =>
      !document
        .getAnimations()
        .some(
          (animation) =>
            animation.playState === 'running' &&
            Number.isFinite(animation.effect?.getTiming().iterations ?? 1),
        ),
  );
  await audit('dark-overview');
  assert.equal(
    unexpected.length,
    0,
    `Unexpected API requests: ${unexpected.join(', ')}`,
  );
  assert.equal(errors.length, 0, `Browser errors: ${errors.join(', ')}`);
  assert.equal(
    reports.flatMap((report) => report.violations).length,
    0,
    'Accessibility violations remain',
  );
  assert.equal(
    reports.flatMap((report) => report.contrast.failures).length,
    0,
    'Text contrast failures remain',
  );
} finally {
  await fs.writeFile(
    path.join(output, 'accessibility-report.json'),
    `${JSON.stringify({ fixture: 'Fictional API responses; no real accounts, payments, or database writes.', browser: await browser.version(), reports, checks, unexpected, errors }, null, 2)}\n`,
  );
  await browser.close();
}
