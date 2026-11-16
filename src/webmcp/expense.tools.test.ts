import { beforeEach, expect, test, vi } from 'vitest';
import { createExpenseTools } from './expense.tools';
import { createTripTools } from './trip.tools';

const mocks = vi.hoisted(() => ({ add: vi.fn(), state: vi.fn() }));
vi.mock('../data/store', () => ({ useBoundStore: { getState: mocks.state } }));
vi.mock('../data/backendConfig', () => ({ assertWritable: vi.fn() }));
vi.mock('../Expense/db', () => ({
  dbAddExpense: mocks.add,
  dbUpdateExpense: vi.fn(),
  dbDeleteExpense: vi.fn(),
}));

beforeEach(() => {
  mocks.add.mockReset().mockResolvedValue({ id: 'new' });
  mocks.state.mockReturnValue({
    currentUser: { id: 'user' },
    authUser: { id: 'user' },
    currentTripId: 'trip',
    trip: {
      trip: {
        id: 'trip',
        currency: 'SGD',
        originCurrency: 'SGD',
        expenseLedger: {
          participants: [
            { id: 'guest', name: 'Bea', guest: true },
            { id: 'archived', name: 'Chen', archived: true },
          ],
        },
      },
    },
  });
});

function tool(name: string) {
  const result = createExpenseTools().find((t) => t.name === name);
  if (!result) throw new Error('Tool missing');
  return result;
}

test('creation defaults to the current payer and exposes payer/split schemas for individual and batch calls', async () => {
  const create = tool('expense-create');
  expect(create.inputSchema.properties).toHaveProperty('ledger');
  const schema = create.inputSchema.properties.ledger as {
    properties: {
      contributions: {
        items: { properties: { amountMinor: { pattern: string } } };
      };
    };
  };
  expect(
    new RegExp(
      schema.properties.contributions.items.properties.amountMinor.pattern,
    ).test('300'),
  ).toBe(true);
  expect(
    tool('expense-create-many').inputSchema.properties.expenses,
  ).toMatchObject({ items: { properties: { ledger: expect.any(Object) } } });
  await create.execute({ title: 'Coffee', amount: 12 });
  expect(mocks.add).toHaveBeenCalledWith(
    expect.objectContaining({
      ledger: { paidBy: 'me', method: null, shares: [] },
    }),
    { tripId: 'trip' },
  );
});

test('trip context exposes guest participant IDs for expense creation', () => {
  const get = createTripTools().find((t) => t.name === 'trip-get');
  if (!get) throw new Error('Missing trip-get');
  expect(get.execute({ tripId: 'trip' })).toMatchObject({
    trip: {
      expenseParticipants: expect.arrayContaining([
        { id: 'guest', name: 'Bea', guest: true },
      ]),
    },
  });
});

test.each([
  ['equal', [{ participantId: 'me' }, { participantId: 'guest' }]],
  [
    'exact',
    [
      { participantId: 'me', value: '3' },
      { participantId: 'guest', value: '7' },
    ],
  ],
  [
    'percent',
    [
      { participantId: 'me', value: '30' },
      { participantId: 'guest', value: '70' },
    ],
  ],
  [
    'shares',
    [
      { participantId: 'me', value: '1' },
      { participantId: 'guest', value: '2' },
    ],
  ],
])(
  'creation accepts guest participants and %s splits',
  async (method, shares) => {
    const ledger = { paidBy: 'guest', method, shares };
    await tool('expense-create').execute({ title: 'Taxi', amount: 10, ledger });
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({ ledger }),
      { tripId: 'trip' },
    );
  },
);

test('batch creation passes multiple payer contributions in the expense currency', async () => {
  const ledger = {
    paidBy: 'multiple',
    method: 'equal',
    shares: [{ participantId: 'guest' }],
    contributions: [
      { participantId: 'me', amountMinor: '3' },
      { participantId: 'guest', amountMinor: '7' },
    ],
  };
  await tool('expense-create-many').execute({
    expenses: [{ title: 'Rail', amount: 10, currency: 'JPY', ledger }],
  });
  expect(mocks.add).toHaveBeenCalledWith(
    expect.objectContaining({ currency: 'JPY', ledger }),
    { tripId: 'trip' },
  );
});

test.each([
  { paidBy: 'unknown' },
  { paidBy: 'archived' },
  { method: 'exact', shares: [{ participantId: 'guest', value: '9' }] },
  {
    method: 'equal',
    shares: [{ participantId: 'guest' }, { participantId: 'guest' }],
  },
  {
    paidBy: 'multiple',
    contributions: [{ participantId: 'guest', amountMinor: '999' }],
  },
  {
    paidBy: 'multiple',
    contributions: [{ participantId: 'guest', amountMinor: 'invalid' }],
  },
])(
  'invalid ledger inputs are rejected before any individual or batch write: %j',
  async (ledger) => {
    await expect(
      tool('expense-create').execute({ title: 'Bad', amount: 10, ledger }),
    ).rejects.toThrow();
    await expect(
      tool('expense-create-many').execute({
        expenses: [
          { title: 'Valid', amount: 10 },
          { title: 'Bad', amount: 10, ledger },
        ],
      }),
    ).rejects.toThrow();
    expect(mocks.add).not.toHaveBeenCalled();
  },
);
