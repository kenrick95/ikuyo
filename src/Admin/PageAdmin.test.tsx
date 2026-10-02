import { Theme } from '@radix-ui/themes';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { get } from '../data/apiClient';
import PageAdmin from './PageAdmin';

vi.mock('../Auth/hooks', () => ({
  useCurrentUser: () => ({ id: 'admin', handle: 'Support', role: 'admin' }),
}));
vi.mock('../Auth/UserAvatarMenu', () => ({ UserAvatarMenu: () => null }));
vi.mock('../Nav/Navbar', () => ({ Navbar: () => null }));
vi.mock('../Nav/DocTitle', () => ({ DocTitle: () => null }));
vi.mock('../data/apiClient', () => ({
  get: vi.fn(),
  deleteMutation: vi.fn(),
  postMutation: vi.fn(),
}));

test('keeps the trip workspace when showing all audit activity and prevents changing filters during pagination', async () => {
  const user = userEvent.setup();
  const page = { data: [], nextCursor: null, hasMore: false };
  let finishPagination!: (value: typeof page) => void;
  vi.mocked(get).mockImplementation(async (path) => {
    if (path.startsWith('/api/admin/users?')) {
      return [
        {
          id: 'owner',
          handle: 'Traveler',
          email: 'traveler@example.com',
          role: 'user',
          deletedAt: null,
        },
      ];
    }
    if (path === '/api/admin/users/owner/trips') {
      return {
        ...page,
        data: [
          {
            id: 'trip',
            title: 'Summer trip',
            archivedAt: null,
            deletedAt: null,
          },
        ],
      };
    }
    if (path === '/api/admin/trips/trip/content') {
      return {
        ...page,
        data: [
          {
            entity: 'activities',
            id: 'activity',
            label: 'Museum visit',
            deletedAt: null,
          },
        ],
      };
    }
    if (path.includes('cursor=')) {
      return new Promise<typeof page>((resolve) => {
        finishPagination = resolve;
      });
    }
    if (path.startsWith('/api/admin/audit-events?')) {
      return { ...page, nextCursor: 'next', hasMore: true };
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  render(
    <Theme>
      <PageAdmin />
    </Theme>,
  );
  await user.click(await screen.findByRole('button', { name: /Traveler/ }));
  await user.click(await screen.findByRole('button', { name: 'Summer trip' }));
  await screen.findByText('Museum visit');
  expect(
    screen.queryByRole('button', { name: 'Delete account' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: /Audit history/ }));
  await user.click(
    await screen.findByRole('button', { name: 'Load more activity' }),
  );
  expect(
    screen.getByRole('button', { name: 'Show all activity' }),
  ).toBeDisabled();
  await act(async () => finishPagination(page));
  await user.click(screen.getByRole('button', { name: 'Show all activity' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Show selected trip' }),
    ).toBeEnabled(),
  );
  expect(screen.getByText('Recent activity across all users')).toBeVisible();
  await user.click(screen.getByRole('tab', { name: /Users & trips/ }));
  expect(
    within(screen.getByRole('region', { name: 'Trip content' })).getByText(
      'Museum visit',
    ),
  ).toBeVisible();
  expect(screen.getByRole('button', { name: 'Summer trip' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
}, 15000);
