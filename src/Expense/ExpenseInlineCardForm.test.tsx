import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { ExpenseInlineCardForm } from './ExpenseInlineCardForm';
import { ExpenseMode } from './ExpenseMode';

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
  toast: vi.fn(),
  local: vi.fn(),
}));
vi.mock('./db', () => ({
  dbAddExpense: mocks.add,
  dbUpdateExpense: mocks.update,
}));
vi.mock('../data/store', () => ({
  useBoundStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentUser: { id: 'u', handle: 'alex' },
      getTripLocalState: () => undefined,
      setTripLocalState: mocks.local,
      publishToast: mocks.toast,
    }),
}));
vi.mock('../common/DatePicker2/DateTimePicker', () => ({
  DateTimePicker: () => <button type="button">Date incurred</button>,
}));

const trip = {
  id: 'trip',
  currency: 'SGD',
  originCurrency: 'SGD',
  timeZone: 'Asia/Singapore',
  timestampStart: 1,
  people: [
    {
      id: 'a',
      name: 'Alex',
      userId: 'u',
      handle: 'alex',
      hasAccount: true,
      accountType: 'registered',
      isParticipant: true,
      accessRole: null,
    },
  ],
  expenseLedger: {},
} as unknown as TripSliceTrip;
beforeEach(() => {
  mocks.add.mockReset();
  mocks.update.mockReset();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
});

const legacyExpense = {
  id: 'legacy',
  title: 'Coffee',
  description: '',
  amount: 10,
  currency: 'USD',
  timestampIncurred: 1,
  ledgerRevision: 0,
} as TripSliceExpense;
const peopleTrip = {
  ...trip,
  people: [
    ...(trip.people ?? []),
    {
      id: 'b',
      name: 'Bea',
      userId: null,
      handle: null,
      hasAccount: false,
      accountType: null,
      isParticipant: true,
      accessRole: null,
    },
  ],
} as TripSliceTrip;

test('a foreign historical expense without conversion supports a title-only edit without adding a ledger', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={trip}
        expense={legacyExpense}
        expenseMode={ExpenseMode.Edit}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  await user.type(
    screen.getByRole('textbox', { name: 'Title *' }),
    ' corrected',
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Coffee corrected',
      currencyConversionFactor: undefined,
      amountInOriginCurrency: undefined,
    }),
  );
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty('ledger');
});

test('an explicit historical payer edit is saved when splitting stays off', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={peopleTrip}
        expense={legacyExpense}
        expenseMode={ExpenseMode.Edit}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  await user.click(screen.getByRole('combobox', { name: 'Paid by' }));
  await user.click(screen.getByRole('option', { name: 'Bea · No account' }));
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      ledger: expect.objectContaining({ paidBy: 'b', method: null }),
    }),
  );
});

test('returning to a currency shows the contributions that will be saved', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={peopleTrip}
        expense={undefined}
        expenseMode={ExpenseMode.Add}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  await user.type(screen.getByRole('textbox', { name: 'Title *' }), 'Taxi');
  await user.type(screen.getByRole('textbox', { name: 'Amount *' }), '10');
  await user.click(screen.getByRole('combobox', { name: 'Paid by' }));
  await user.click(screen.getByRole('option', { name: 'Multiple people' }));
  const fill = async (name: string, value: string) => {
    const input = screen.getByRole('textbox', { name });
    await user.clear(input);
    await user.type(input, value);
  };
  await fill('Alex paid in SGD', '3');
  await fill('Bea paid in SGD', '7');
  await user.click(screen.getByRole('combobox', { name: 'Currency' }));
  await user.click(screen.getByRole('option', { name: 'USD' }));
  await fill('Alex paid in USD', '6');
  await fill('Bea paid in USD', '4');
  await user.click(screen.getByRole('combobox', { name: 'Currency' }));
  await user.click(screen.getByRole('option', { name: 'SGD' }));
  expect(screen.getByRole('textbox', { name: 'Alex paid in SGD' })).toHaveValue(
    '6.00',
  );
  expect(screen.getByRole('textbox', { name: 'Bea paid in SGD' })).toHaveValue(
    '4.00',
  );
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add).toHaveBeenCalledWith(
    expect.objectContaining({
      ledger: expect.objectContaining({
        contributions: [
          { participantId: 'a', amountMinor: '600' },
          { participantId: 'b', amountMinor: '400' },
        ],
      }),
    }),
    expect.anything(),
  );
});

test.each([
  ['SGD', 'JPY', '3', '7'],
  ['JPY', 'SGD', '300', '700'],
  ['SGD', 'KWD', '3000', '7000'],
])(
  'currency changes from %s to %s preserve decimal payer amounts',
  async (from, to, alexMinor, beaMinor) => {
    const user = userEvent.setup();
    render(
      <Theme>
        <ExpenseInlineCardForm
          trip={{ ...peopleTrip, currency: from }}
          expense={undefined}
          expenseMode={ExpenseMode.Add}
          setExpenseMode={vi.fn()}
        />
      </Theme>,
    );
    await user.type(screen.getByRole('textbox', { name: 'Title *' }), 'Taxi');
    await user.type(screen.getByRole('textbox', { name: 'Amount *' }), '10');
    await user.click(screen.getByRole('combobox', { name: 'Paid by' }));
    await user.click(screen.getByRole('option', { name: 'Multiple people' }));
    for (const [name, amount] of [
      ['Alex', '3'],
      ['Bea', '7'],
    ]) {
      const input = screen.getByRole('textbox', {
        name: `${name} paid in ${from}`,
      });
      await user.clear(input);
      await user.type(input, amount);
    }
    await user.click(screen.getByRole('combobox', { name: 'Currency' }));
    await user.click(screen.getByRole('option', { name: to }));
    expect(
      Number(
        screen
          .getByRole('textbox', { name: `Alex paid in ${to}` })
          .getAttribute('value'),
      ),
    ).toBe(3);
    expect(
      Number(
        screen
          .getByRole('textbox', { name: `Bea paid in ${to}` })
          .getAttribute('value'),
      ),
    ).toBe(7);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: to,
        ledger: expect.objectContaining({
          contributions: [
            { participantId: 'a', amountMinor: alexMinor },
            { participantId: 'b', amountMinor: beaMinor },
          ],
        }),
      }),
      expect.anything(),
    );
  },
);

test('currency changes require re-entry when payer precision cannot fit the new currency', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={peopleTrip}
        expense={undefined}
        expenseMode={ExpenseMode.Add}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  await user.type(screen.getByRole('textbox', { name: 'Title *' }), 'Taxi');
  await user.type(screen.getByRole('textbox', { name: 'Amount *' }), '10');
  await user.click(screen.getByRole('combobox', { name: 'Paid by' }));
  await user.click(screen.getByRole('option', { name: 'Multiple people' }));
  for (const [name, amount] of [
    ['Alex', '3.50'],
    ['Bea', '6.50'],
  ]) {
    const input = screen.getByRole('textbox', { name: `${name} paid in SGD` });
    await user.clear(input);
    await user.type(input, amount);
  }
  await user.click(screen.getByRole('combobox', { name: 'Currency' }));
  await user.click(screen.getByRole('option', { name: 'JPY' }));
  expect(screen.getByRole('textbox', { name: 'Alex paid in JPY' })).toHaveValue(
    '',
  );
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Enter valid payer amounts.',
  );
});

test('single payer selection clears invalid hidden contributions and their input cache', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={peopleTrip}
        expense={legacyExpense}
        expenseMode={ExpenseMode.Edit}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  const choosePayer = async (name: string) => {
    await user.click(screen.getByRole('combobox', { name: 'Paid by' }));
    await user.click(screen.getByRole('option', { name }));
  };
  await choosePayer('Multiple people');
  await user.type(
    screen.getByRole('textbox', { name: 'Alex paid in USD' }),
    'invalid',
  );
  await choosePayer('Bea · No account');
  await choosePayer('Multiple people');
  expect(screen.getByRole('textbox', { name: 'Alex paid in USD' })).toHaveValue(
    '0.00',
  );
  await user.clear(screen.getByRole('textbox', { name: 'Alex paid in USD' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Alex paid in USD' }),
    '10',
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      ledger: expect.objectContaining({
        paidBy: 'multiple',
        method: null,
        contributions: [{ participantId: 'a', amountMinor: '1000' }],
      }),
    }),
  );
});

test('inline save defaults to the current payer and preserves the draft and ID after a failed request', async () => {
  const user = userEvent.setup(),
    done = vi.fn();
  mocks.add
    .mockRejectedValueOnce(new Error('Connection failed'))
    .mockResolvedValueOnce({ id: 'new' });
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={trip}
        expense={undefined}
        expenseMode={ExpenseMode.Add}
        setExpenseMode={done}
      />
    </Theme>,
  );
  await user.type(screen.getByRole('textbox', { name: 'Title *' }), 'Coffee');
  await user.type(screen.getByRole('textbox', { name: 'Amount *' }), '12');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByText('Connection failed')).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: 'Title *' })).toHaveValue(
    'Coffee',
  );
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add.mock.calls[0][1].expenseId).toBe(
    mocks.add.mock.calls[1][1].expenseId,
  );
  expect(mocks.add).toHaveBeenLastCalledWith(
    expect.objectContaining({
      ledger: { paidBy: 'a', method: null, shares: [] },
      currencyConversionFactor: 1,
      amountInOriginCurrency: 12,
    }),
    expect.anything(),
  );
  expect(done).toHaveBeenCalledWith(ExpenseMode.View);
});

test('an incoming refresh cannot advance an open edit draft past its original revision', async () => {
  const user = userEvent.setup();
  mocks.update.mockResolvedValue({});
  const expense = {
    id: 'e',
    tripId: 'trip',
    title: 'Dinner',
    description: '',
    amount: 10,
    currency: 'SGD',
    timestampIncurred: 1,
    ledgerRevision: 1,
    createdAt: 1,
    lastUpdatedAt: 1,
    currencyConversionFactor: 1,
    amountInOriginCurrency: 10,
    timeZoneIncurred: 'Asia/Singapore',
    commentGroupId: undefined,
    ledger: {
      paidBy: 'a',
      method: null,
      shares: [],
      contributions: [{ participantId: 'a', amountMinor: '1000' }],
    },
  } as TripSliceExpense;
  const { rerender } = render(
    <Theme>
      <ExpenseInlineCardForm
        trip={trip}
        expense={expense}
        expenseMode={ExpenseMode.Edit}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  rerender(
    <Theme>
      <ExpenseInlineCardForm
        trip={trip}
        expense={{ ...expense, ledgerRevision: 2, amount: 20 }}
        expenseMode={ExpenseMode.Edit}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({ amount: 10, ledgerRevision: 1 }),
  );
});

test('a refund reuses the original split and records a positive amount with an explicit reversal kind', async () => {
  const user = userEvent.setup();
  mocks.add.mockResolvedValue({ id: 'refund' });
  const original = {
    id: 'original',
    title: 'Hotel',
    amount: 90,
    currency: 'SGD',
    ledger: {
      kind: 'expense',
      paidBy: 'a',
      method: 'equal',
      shares: [{ participantId: 'a' }],
    },
  } as unknown as TripSliceExpense;
  render(
    <Theme>
      <ExpenseInlineCardForm
        trip={trip}
        expense={undefined}
        refundOf={original}
        expenseMode={ExpenseMode.Add}
        setExpenseMode={vi.fn()}
      />
    </Theme>,
  );
  expect(screen.getByText('Record refund')).toBeInTheDocument();
  expect(screen.getByRole('switch', { name: 'Split expense' })).toBeDisabled();
  const amount = screen.getByRole('textbox', { name: 'Amount *' });
  await user.clear(amount);
  await user.type(amount, '30');
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add).toHaveBeenCalledWith(
    expect.objectContaining({
      amount: 30,
      ledger: expect.objectContaining({
        kind: 'refund',
        refundOf: 'original',
        paidBy: 'a',
      }),
    }),
    expect.anything(),
  );
});
