import { Theme } from '@radix-ui/themes';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { TripUserRole } from '../../User/TripUserRole';
import { TripSharingDialog } from './TripSharingDialog';

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  patch: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('../../Auth/hooks', () => ({
  useCurrentUser: () => ({ id: 'owner', email: 'owner@example.com' }),
}));
vi.mock('../../data/store', () => ({
  useBoundStore: Object.assign(
    (select: (state: unknown) => unknown) =>
      select({ popDialog: vi.fn(), publishToast: mocks.toast }),
    { getState: () => ({ refreshTrip: mocks.refresh }) },
  ),
}));
vi.mock('../../data/apiClient', () => ({
  postMutation: vi.fn(),
  patchMutation: mocks.patch,
}));
vi.mock('../db', () => ({
  dbAddUserToTrip: mocks.add,
  dbRemoveUserFromTrip: vi.fn(),
  dbUpdateTripSectionVisibility: vi.fn(),
  dbUpdateTripSharingLevel: vi.fn(),
}));
vi.mock('../store/hooks', () => ({
  useTrip: () => ({
    trip: {
      id: 'trip',
      title: 'Trip',
      currentUserRole: 'owner',
      sharingLevel: 0,
      tripUserIds: ['member'],
      people: [],
    },
  }),
  useTripUserIds: () => [
    {
      id: 'member',
      userId: 'guest-user',
      handle: 'guest_account',
      email: null,
      accountType: 'guest',
      role: 'viewer',
      activated: true,
    },
  ],
}));

beforeEach(() => {
  mocks.add.mockReset().mockResolvedValue({});
  mocks.patch.mockReset().mockResolvedValue({});
  mocks.refresh.mockReset().mockResolvedValue(undefined);
});

test('sharing with a guest account does not imply joining unless explicitly selected', async () => {
  const user = userEvent.setup();
  render(
    <Theme>
      <TripSharingDialog tripId="trip" accountIdentity="@guest_account" />
    </Theme>,
  );
  expect(screen.getByText('Guest account')).toBeInTheDocument();
  expect(
    screen.getByRole('checkbox', { name: 'guest_account is joining the trip' }),
  ).not.toBeChecked();
  const joining = screen.getByRole('checkbox', {
    name: 'Also add to participants',
  });
  expect(joining).not.toBeChecked();
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add).toHaveBeenLastCalledWith({
    tripId: 'trip',
    userEmail: '@guest_account',
    userRole: TripUserRole.Viewer,
    addToParticipants: false,
  });
  await user.type(
    screen.getByRole('textbox', { name: 'Account to share with' }),
    '@guest_account',
  );
  await user.click(joining);
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(mocks.add).toHaveBeenLastCalledWith({
    tripId: 'trip',
    userEmail: '@guest_account',
    userRole: TripUserRole.Viewer,
    addToParticipants: true,
  });
});

test('a failed sharing request shows the error and retains an editable draft', async () => {
  const user = userEvent.setup();
  mocks.add.mockRejectedValueOnce(new Error('Account unavailable'));
  render(
    <Theme>
      <TripSharingDialog tripId="trip" accountIdentity="@guest_account" />
    </Theme>,
  );
  await user.click(screen.getByRole('button', { name: 'Add' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Account unavailable');
  expect(
    screen.getByRole('textbox', { name: 'Account to share with' }),
  ).toHaveValue('@guest_account');
  expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
});
