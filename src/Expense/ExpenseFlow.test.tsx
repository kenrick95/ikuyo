import { Theme } from '@radix-ui/themes';
import {
  act,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  TripPeopleDialog,
  useTripPeople,
} from '../Trip/people/TripPeopleDialog';
import type { TripSliceTrip } from '../Trip/store/types';
import { TripUserRole } from '../User/TripUserRole';
import { ExpenseBalancesDialog } from './ExpenseBalancesDialog';
import { ExpenseSplitFields } from './ExpenseSplitFields';
import type { ExpenseLedger } from './ledger';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  refresh: vi.fn(),
  currentUser: { id: 'user-a', handle: 'alex' },
  pushDialog: vi.fn(),
}));
vi.mock('../data/apiClient', () => ({
  postMutation: mocks.post,
  patchMutation: mocks.patch,
  deleteMutation: vi.fn(),
}));
vi.mock('../data/store', () => ({
  useBoundStore: (selector: (s: unknown) => unknown) =>
    selector({
      currentUser: mocks.currentUser,
      refreshTrip: mocks.refresh,
      pushDialog: mocks.pushDialog,
    }),
}));

const trip = {
  id: 'trip',
  currency: 'SGD',
  timeZone: 'Asia/Singapore',
  currentUserRole: TripUserRole.Owner,
  people: [
    {
      id: 'a',
      name: 'Alex',
      handle: 'alex',
      userId: 'user-a',
      hasAccount: true,
      accountType: 'registered',
      isParticipant: true,
      accessRole: null,
    },
    {
      id: 'b',
      name: 'Bea',
      handle: null,
      userId: null,
      hasAccount: false,
      accountType: null,
      isParticipant: true,
      accessRole: null,
    },
  ],
  expenseLedger: {
    currencies: [
      {
        currency: 'SGD',
        balances: [
          { participantId: 'a', amountMinor: '3000' },
          { participantId: 'b', amountMinor: '-3000' },
        ],
        suggestions: [{ senderId: 'b', recipientId: 'a', amountMinor: '3000' }],
      },
      {
        currency: 'JPY',
        balances: [
          { participantId: 'a', amountMinor: '-3000' },
          { participantId: 'b', amountMinor: '3000' },
        ],
        suggestions: [{ senderId: 'a', recipientId: 'b', amountMinor: '3000' }],
      },
    ],
    payments: [],
    splitCount: 2,
    expenseCount: 3,
  },
} as unknown as TripSliceTrip;

function Fields({ context = trip }: { context?: TripSliceTrip }) {
  const [ledger, setLedger] = useState<ExpenseLedger>({
    paidBy: 'a',
    method: null,
    shares: [],
  });
  return (
    <ExpenseSplitFields
      trip={context}
      amount="60"
      currency="SGD"
      value={ledger}
      onChange={setLedger}
      disabled={false}
    />
  );
}

beforeEach(() => {
  mocks.post.mockReset();
  mocks.refresh.mockResolvedValue(undefined);
  mocks.patch.mockResolvedValue({});
});

test('the payer roster reuses its reference across unrelated trip changes', () => {
  const context: TripSliceTrip = {
    ...trip,
    people: trip.people?.filter((person) => person.id !== 'a'),
  };
  const { result, rerender } = renderHook(
    (currentTrip) => useTripPeople(currentTrip, true),
    {
      initialProps: context,
    },
  );
  const original = result.current;
  expect(original[0]).toMatchObject({ id: 'me', userId: 'user-a' });
  rerender({ ...context, title: 'Renamed trip' });
  expect(result.current).toBe(original);
  rerender(trip);
  expect(result.current).toBe(trip.people);
});

test('the people dialog builds roster rows when opened', async () => {
  const user = userEvent.setup();
  const people = [...(trip.people ?? [])];
  const buildRows = vi.spyOn(people, 'map');
  render(
    <Theme>
      <TripPeopleDialog trip={{ ...trip, people }} />
    </Theme>,
  );
  expect(buildRows).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'People' }));
  expect(buildRows).toHaveBeenCalled();
  expect(screen.getByRole('rowheader', { name: /Bea/ })).toBeVisible();
});

test('settlement actions stay disabled until a delayed authoritative refresh completes', async () => {
  const user = userEvent.setup();
  mocks.post.mockResolvedValue({ id: 'payment' });
  let finish!: () => void;
  mocks.refresh.mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <Theme>
      <ExpenseBalancesDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'Balances' }));
  await user.click(screen.getAllByRole('button', { name: /^Settle$/ })[0]);
  await user.click(screen.getByRole('button', { name: 'Record payment' }));
  expect(mocks.refresh).toHaveBeenCalledWith('trip');
  for (const button of screen.getAllByRole('button', { name: /^Settle$/ }))
    expect(button).toBeDisabled();
  expect(
    screen.getByRole('button', { name: 'Record settlement' }),
  ).toBeDisabled();
  await user.click(screen.getAllByRole('button', { name: /^Settle$/ })[0]);
  expect(mocks.post).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish();
  });
  expect(screen.getAllByRole('button', { name: /^Settle$/ })[0]).toBeEnabled();
});

test('a failed refresh keeps stale suggestions disabled and retries the read without another payment', async () => {
  const user = userEvent.setup();
  mocks.post.mockResolvedValue({ id: 'payment' });
  mocks.refresh
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce(undefined);
  render(
    <Theme>
      <ExpenseBalancesDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'Balances' }));
  await user.click(screen.getAllByRole('button', { name: /^Settle$/ })[0]);
  await user.click(screen.getByRole('button', { name: 'Record payment' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Offline');
  expect(screen.getAllByRole('button', { name: /^Settle$/ })[0]).toBeDisabled();
  await user.click(screen.getByRole('button', { name: 'Refresh balances' }));
  expect(mocks.post).toHaveBeenCalledTimes(1);
  expect(mocks.refresh).toHaveBeenCalledTimes(2);
  expect(screen.getAllByRole('button', { name: /^Settle$/ })[0]).toBeEnabled();
});
describe('integrated expense controls', () => {
  test('splitting expands inline and the people picker cancels without changing the selection', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <Fields />
      </Theme>,
    );
    expect(
      screen.queryByRole('button', { name: 'Choose people' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Split expense' }));
    expect(screen.getAllByText('SGD 30.00')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Choose people' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('No account')).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('checkbox', { name: 'Include Bea' }),
    );
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getAllByText('SGD 30.00')).toHaveLength(2);
  });
  test('name-only people and exact account lookup use distinct actions', async () => {
    const user = userEvent.setup();
    mocks.post
      .mockResolvedValueOnce({ id: 'd' })
      .mockResolvedValueOnce({ user: { id: 'm', handle: 'morgan' } })
      .mockResolvedValueOnce({ id: 'p-m' });
    render(
      <Theme>
        <Fields />
      </Theme>,
    );
    await user.click(screen.getByRole('switch', { name: 'Split expense' }));
    await user.click(screen.getByRole('button', { name: 'Choose people' }));
    const dialog = screen.getByRole('dialog'),
      search = within(dialog).getByPlaceholderText(
        'Name, Ikuyo email or @username',
      );
    await user.type(search, 'Dana');
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(mocks.post).toHaveBeenCalledWith(
      '/api/trips/trip/people',
      expect.objectContaining({ name: 'Dana' }),
    );
    await user.type(search, '@morgan');
    await user.click(within(dialog).getByRole('button', { name: 'Find' }));
    expect(mocks.post).toHaveBeenCalledWith('/api/trips/trip/people/lookup', {
      identity: '@morgan',
    });
    await user.click(within(dialog).getByRole('button', { name: 'Add' }));
    expect(mocks.post).toHaveBeenLastCalledWith(
      '/api/trips/trip/people',
      expect.objectContaining({ userId: 'm' }),
    );
  });
  test('currency groups settle independently, with a partial payment returning to balances', async () => {
    const user = userEvent.setup();
    mocks.post.mockResolvedValue({ id: 'payment' });
    render(
      <Theme>
        <ExpenseBalancesDialog trip={trip} />
      </Theme>,
    );
    await user.click(screen.getByRole('button', { name: 'Balances' }));
    expect(screen.getByText('Owed SGD 30.00')).toBeInTheDocument();
    expect(screen.getByText('Owes JPY 3,000')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^Settle$/ })[0]);
    const amount = screen.getByRole('textbox', { name: 'Amount · SGD' });
    await user.clear(amount);
    await user.type(amount, '20');
    await user.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(mocks.post).toHaveBeenCalledWith(
      '/api/trips/trip/expense-payments',
      expect.objectContaining({
        senderId: 'b',
        recipientId: 'a',
        currency: 'SGD',
        amountMinor: '2000',
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'Balances' }),
    ).toBeInTheDocument();
  });
});

test('an explicit cross-currency settlement records both amounts without changing the debt currency', async () => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  HTMLElement.prototype.setPointerCapture = vi.fn();
  HTMLElement.prototype.releasePointerCapture = vi.fn();
  const user = userEvent.setup();
  mocks.post.mockResolvedValue({ id: 'p' });
  render(
    <Theme>
      <ExpenseBalancesDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'Balances' }));
  await user.click(screen.getAllByRole('button', { name: /^Settle$/ })[1]);
  await user.click(
    screen.getByRole('checkbox', { name: 'Paid in another currency' }),
  );
  await user.click(screen.getAllByRole('combobox')[2]);
  await user.click(screen.getByRole('option', { name: 'SGD' }));
  await user.type(
    screen.getByRole('textbox', { name: 'Amount paid · SGD' }),
    '30',
  );
  await user.click(screen.getByRole('button', { name: 'Record payment' }));
  expect(mocks.post).toHaveBeenCalledWith(
    '/api/trips/trip/expense-payments',
    expect.objectContaining({
      currency: 'JPY',
      amountMinor: '3000',
      paidCurrency: 'SGD',
      paidAmountMinor: '3000',
    }),
  );
});

test('participant management renames a label without changing its financial identity', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <TripPeopleDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'People' }));
  await user.click(screen.getByRole('button', { name: 'Actions for Bea' }));
  await user.click(screen.getByRole('menuitem', { name: 'Rename' }));
  const input = screen.getByRole('textbox', { name: 'Name for Bea' });
  await user.clear(input);
  await user.type(input, 'Beatrice');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(mocks.patch).toHaveBeenCalledWith('/api/trips/trip/people/b', {
    name: 'Beatrice',
  });
});

test('a name-only person and a guest account receive different labels', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <TripPeopleDialog
        trip={{
          ...trip,
          people: trip.people?.map((p) =>
            p.id === 'a' ? { ...p, accountType: 'guest' } : p,
          ),
        }}
      />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'People' }));
  expect(screen.getByText('No account')).toBeInTheDocument();
  expect(screen.getByText('Guest account')).toBeInTheDocument();
});

test('linking an account changes the existing trip person without granting access', async () => {
  const user = userEvent.setup();
  mocks.post.mockResolvedValue({
    user: { id: 'guest-user', handle: 'guest_account' },
  });
  render(
    <Theme>
      <TripPeopleDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'People' }));
  await user.click(screen.getByRole('button', { name: 'Actions for Bea' }));
  await user.click(screen.getByRole('menuitem', { name: 'Link account' }));
  const popover = within(
    await screen.findByRole('dialog', { name: 'Link account to Bea' }),
  );
  const identity = popover.getByRole('textbox', {
    name: 'Ikuyo email or @username',
  });
  expect(identity).toHaveFocus();
  await user.type(identity, '@guest_account{Enter}');
  expect(await popover.findByText('Found @guest_account')).toBeVisible();
  expect(mocks.patch).not.toHaveBeenCalled();
  await user.click(popover.getByRole('button', { name: 'Link account' }));
  expect(mocks.post).toHaveBeenCalledTimes(1);
  expect(mocks.post).toHaveBeenCalledWith('/api/trips/trip/people/lookup', {
    identity: '@guest_account',
  });
  expect(mocks.patch).toHaveBeenCalledWith('/api/trips/trip/people/b', {
    userId: 'guest-user',
  });
});

test('participation can change separately from access and financial records', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <TripPeopleDialog trip={trip} />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'People' }));
  await user.click(
    screen.getByRole('checkbox', { name: 'Bea is joining the trip' }),
  );
  expect(mocks.patch).toHaveBeenCalledWith('/api/trips/trip/people/b', {
    isParticipant: false,
  });
  expect(mocks.post).not.toHaveBeenCalled();
});

test('the split defaults to participants while its payer can be a non-travelling planner', async () => {
  const user = userEvent.setup();
  const context = {
    ...trip,
    people: trip.people?.map((p) =>
      p.id === 'a' ? { ...p, isParticipant: false } : p,
    ),
  };
  render(
    <Theme>
      <Fields context={context} />
    </Theme>,
  );
  expect(screen.getByRole('combobox', { name: 'Paid by' })).toHaveTextContent(
    'Alex',
  );
  await user.click(screen.getByRole('switch', { name: 'Split expense' }));
  expect(screen.getByText('SGD 60.00')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Choose people' }));
  expect(
    screen.getByRole('checkbox', { name: 'Include Alex' }),
  ).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Include Bea' })).toBeChecked();
});
