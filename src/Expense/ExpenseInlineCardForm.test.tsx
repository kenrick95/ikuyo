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
  expenseLedger: {
    participants: [
      { id: 'a', name: 'Alex', userId: 'u', handle: 'alex', guest: false },
    ],
  },
} as unknown as TripSliceTrip;
beforeEach(() => {
  mocks.add.mockReset();
  mocks.update.mockReset();
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
