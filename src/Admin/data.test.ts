import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ApiError, get } from '../data/apiClient';
import { useAdminPage, useAdminResource } from './data';

vi.mock('../data/apiClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../data/apiClient')>()),
  get: vi.fn(),
}));
beforeEach(() => vi.mocked(get).mockReset());

test('removes stale details when the refresh after a mutation fails', async () => {
  vi.mocked(get)
    .mockResolvedValueOnce({ deletedAt: null })
    .mockRejectedValueOnce(new Error('Refresh failed'));
  const { result } = renderHook(() =>
    useAdminResource<{ deletedAt: string | null }>('/api/admin/users/owner'),
  );
  await waitFor(() => expect(result.current.data).toEqual({ deletedAt: null }));
  act(() => result.current.reload());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toBeUndefined();
  expect(result.current.error).toContain('Refresh failed');
});

test('a late mutation callback cannot reload an unmounted page', async () => {
  vi.mocked(get).mockResolvedValue({ id: 'owner' });
  const { result, unmount } = renderHook(() =>
    useAdminResource('/api/admin/users/owner'),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  const reload = result.current.reload;
  unmount();
  act(() => reload());
  expect(get).toHaveBeenCalledTimes(1);
});

test.each([401, 403, 404])(
  'removes loaded records and cursor when pagination returns %s',
  async (status) => {
    vi.mocked(get)
      .mockResolvedValueOnce({
        data: [{ id: 'private' }],
        nextCursor: 'next',
        hasMore: true,
      })
      .mockRejectedValueOnce(new ApiError('Access denied', status));
    const { result } = renderHook(() =>
      useAdminPage('/api/admin/audit-events'),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(() => result.current.loadMore());
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toContain('Access denied');
  },
);

test('keeps loaded records when a later page has a transient failure', async () => {
  const page = { data: [{ id: 'private' }], nextCursor: 'next', hasMore: true };
  vi.mocked(get)
    .mockResolvedValueOnce(page)
    .mockRejectedValueOnce(new ApiError('Unavailable', 503));
  const { result } = renderHook(() => useAdminPage('/api/admin/audit-events'));
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() => result.current.loadMore());
  expect(result.current.data).toEqual(page);
  expect(result.current.loadingMore).toBe(false);
});
