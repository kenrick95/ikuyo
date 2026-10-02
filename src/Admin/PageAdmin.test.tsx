import { Theme } from '@radix-ui/themes';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { Route } from 'wouter';
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

const owner = {
  id: 'owner',
  handle: 'Traveler',
  email: 'traveler@example.com',
  role: 'user',
  deletedAt: null,
};
const trip = {
  id: 'trip',
  title: 'Summer trip',
  archivedAt: null,
  deletedAt: null,
};
const page = { data: [], nextCursor: null, hasMore: false };
async function mount() {
  const result = render(
    <Theme>
      <Route path="/admin" nest>
        <PageAdmin />
      </Route>
    </Theme>,
  );
  await act(() => vi.dynamicImportSettled());
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState(null, '', '/admin');
  vi.mocked(get).mockImplementation(async (path) => {
    if (path.startsWith('/api/admin/users?')) return [owner];
    if (path === '/api/admin/users/owner') return owner;
    if (path === '/api/admin/users/owner/trips')
      return { ...page, data: [trip] };
    if (path === '/api/admin/trips/trip') return trip;
    if (path === '/api/admin/trips/trip/content')
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
    if (path.startsWith('/api/admin/audit-events'))
      return { ...page, nextCursor: 'next', hasMore: true };
    throw new Error(`Unexpected request: ${path}`);
  });
});

test('navigates separate user and trip pages, reloads a direct trip URL, and supports Back', async () => {
  window.history.replaceState(null, '', '/admin/users?search=Traveler');
  const first = await mount();
  fireEvent.click(await screen.findByRole('link', { name: /Traveler/ }));
  expect(location.pathname).toBe('/admin/users/owner');
  expect(new URLSearchParams(location.search).get('search')).toBe('Traveler');
  await act(() => vi.dynamicImportSettled());
  fireEvent.click(await screen.findByRole('link', { name: 'Summer trip' }));
  expect(location.pathname).toBe('/admin/trips/trip');
  await act(() => vi.dynamicImportSettled());
  await screen.findByText('Museum visit');
  expect(screen.getByRole('link', { name: '← User’s trips' })).toHaveAttribute(
    'href',
    '/admin/users/owner?search=Traveler',
  );
  expect(
    screen.queryByRole('region', { name: 'Find users' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('region', { name: 'User trips' }),
  ).not.toBeInTheDocument();
  first.unmount();
  await mount();
  await screen.findByText('Museum visit');
  fireEvent.click(screen.getByRole('link', { name: 'Trip activity' }));
  expect(location.pathname).toBe('/admin/trips/trip/activity');
  expect(new URLSearchParams(location.search).get('user')).toBe('owner');
  await act(() => vi.dynamicImportSettled());
  await screen.findByRole('button', { name: 'Load more activity' });
  act(() => window.history.back());
  await waitFor(() => expect(location.pathname).toBe('/admin/trips/trip'));
  await screen.findByText('Museum visit');
}, 15000);

test('preserves the account and search when opening a trip from an audit event', async () => {
  window.history.replaceState(
    null,
    '',
    '/admin/trips/trip/activity?search=Traveler&user=owner',
  );
  const original = vi.mocked(get).getMockImplementation();
  if (!original) throw new Error('Missing API mock');
  vi.mocked(get).mockImplementation((path) =>
    path.startsWith('/api/admin/audit-events')
      ? Promise.resolve({
          ...page,
          data: [
            {
              id: 42,
              actorHandle: 'Support',
              tripId: 'trip',
              targetId: 'trip',
              action: 'view',
              targetType: 'trip',
              details: { fields: [] },
              createdAt: 1,
            },
          ],
        })
      : original(path),
  );
  await mount();
  fireEvent.click(await screen.findByText('Record details'));
  fireEvent.click(screen.getByRole('link', { name: 'Trip trip' }));
  expect(location.pathname).toBe('/admin/trips/trip');
  expect(new URLSearchParams(location.search).get('search')).toBe('Traveler');
  expect(new URLSearchParams(location.search).get('user')).toBe('owner');
  await screen.findByText('Museum visit');
  expect(screen.getByRole('link', { name: '← User’s trips' })).toHaveAttribute(
    'href',
    '/admin/users/owner?search=Traveler',
  );
}, 15000);

test('discards pending trip pagination after navigating to all activity', async () => {
  window.history.replaceState(null, '', '/admin/trips/trip/activity');
  const original = vi.mocked(get).getMockImplementation();
  if (!original) throw new Error('Missing API mock');
  let finish!: (result: unknown) => void;
  vi.mocked(get).mockImplementation((path) => {
    if (path.includes('cursor='))
      return new Promise((resolve) => {
        finish = resolve;
      });
    return original(path);
  });
  await mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Load more activity' }),
  );
  fireEvent.click(screen.getByRole('link', { name: 'Show all activity' }));
  expect(location.pathname).toBe('/admin/activity');
  await screen.findByRole('button', { name: 'Load more activity' });
  await act(async () =>
    finish({
      ...page,
      data: [
        {
          id: 42,
          actorHandle: 'Stale actor',
          action: 'view',
          targetType: 'trip',
          details: { fields: [] },
          createdAt: 1,
        },
      ],
    }),
  );
  expect(screen.queryByText('Stale actor')).not.toBeInTheDocument();
  expect(get).not.toHaveBeenCalledWith('/api/admin/users?search=');
  expect(get).not.toHaveBeenCalledWith('/api/admin/trips/trip/content');
}, 15000);

test('loads a deleted user directly without relying on search results', async () => {
  window.history.replaceState(null, '', '/admin/users/owner');
  const original = vi.mocked(get).getMockImplementation();
  if (!original) throw new Error('Missing API mock');
  vi.mocked(get).mockImplementation((path) =>
    path === '/api/admin/users/owner'
      ? Promise.resolve({ ...owner, deletedAt: '2026-10-01' })
      : original(path),
  );
  await mount();
  expect(await screen.findByText('[deleted]')).toBeVisible();
  expect(
    within(screen.getByRole('region', { name: 'User trips' })).getByRole(
      'heading',
      { name: 'Traveler' },
    ),
  ).toBeVisible();
  expect(get).not.toHaveBeenCalledWith('/api/admin/users?search=');
}, 15000);
