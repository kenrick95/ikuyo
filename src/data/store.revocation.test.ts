import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripSliceActivity, TripSliceTrip } from '../Trip/store/types';
import type { TripsSliceTrip } from '../Trips/store';
import type { DbUser } from '../User/db';
import { useBoundStore } from './store';
import { usePeriodicTripSync } from './usePeriodicTripSync';

const user: DbUser = {
  id: 'user-1',
  role: 'admin',
  handle: 'traveler',
  email: 'traveler@example.com',
  createdAt: 1,
  lastUpdatedAt: 1,
  activated: true,
  lastLoginAt: undefined,
};

function seedPrivateTrip() {
  useBoundStore.setState({
    currentUser: user,
    authUser: { id: user.id, email: user.email ?? null },
    authUserLoading: true,
    trip: {
      'trip-1': {
        id: 'trip-1',
        title: 'Private trip title',
      } as TripSliceTrip,
    },
    activity: {
      'activity-1': {
        id: 'activity-1',
        tripId: 'trip-1',
        title: 'Private activity title',
      } as TripSliceActivity,
    },
    trips: {
      'user-1': [
        { id: 'trip-1', title: 'Private trip title' } as TripsSliceTrip,
      ],
    },
    dialogs: [{ component: () => null, props: { secret: 'Private dialog' } }],
    isConfirmingPopDialogActive: true,
    confirmingDialogProps: { description: 'Private confirmation' },
  });
}

describe('persisted trip revocation', () => {
  beforeEach(() => {
    useBoundStore.getState().clearSession();
    seedPrivateTrip();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    useBoundStore.getState().clearSession();
  });

  it.each([401, 403, 404])(
    'removes cached private data after background sync returns %s',
    async (status) => {
      vi.useFakeTimers();
      const fetchMock = vi.fn(async () => ({
        ok: false,
        status,
        text: async () => JSON.stringify({ message: 'Access revoked' }),
      }));
      vi.stubGlobal('fetch', fetchMock);
      const hook = renderHook(() =>
        usePeriodicTripSync('trip-1', () => undefined, 100),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      hook.unmount();

      expect(fetchMock.mock.calls).toHaveLength(2);
      const state = useBoundStore.getState();
      expect(state.trip['trip-1']).toBeUndefined();
      expect(state.activity['activity-1']).toBeUndefined();
      expect(state.dialogs).toEqual([]);
      expect(state.confirmingDialogProps).toBeUndefined();
      expect(state.currentUser?.id).toBe(status === 401 ? undefined : user.id);
      expect(localStorage.getItem('ikuyo-storage') ?? '').not.toContain(
        'Private trip title',
      );
    },
  );

  it('keeps cached data on a transient background sync failure', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ message: 'Unavailable' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() =>
      usePeriodicTripSync('trip-1', () => undefined, 100),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    hook.unmount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(useBoundStore.getState().trip['trip-1']?.title).toBe(
      'Private trip title',
    );
  });

  it.each(['session change', 'unmount'])(
    'ignores a delayed sync denial after %s',
    async (reason) => {
      vi.useFakeTimers();
      const denied = {
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'Forbidden' }),
      };
      let release!: (response: typeof denied) => void;
      const fetchMock = vi.fn(
        () =>
          new Promise<typeof denied>((resolve) => {
            release = resolve;
          }),
      );
      vi.stubGlobal('fetch', fetchMock);
      const hook = renderHook(() =>
        usePeriodicTripSync('trip-1', () => undefined, 100),
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
      if (reason === 'session change') {
        useBoundStore.getState().clearSession();
        seedPrivateTrip();
      } else hook.unmount();
      await act(async () => {
        release(denied);
      });
      hook.unmount();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(useBoundStore.getState().trip['trip-1']?.title).toBe(
        'Private trip title',
      );
    },
  );

  it('clears private data when session validation finds no user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => JSON.stringify({ user: null }),
      })),
    );

    const unsubscribe = useBoundStore.getState().subscribeUser();
    await waitFor(() =>
      expect(useBoundStore.getState().authUserLoading).toBe(false),
    );
    unsubscribe();

    const state = useBoundStore.getState();
    expect(state.currentUser).toBeUndefined();
    expect(state.trip['trip-1']).toBeUndefined();
    expect(state.activity['activity-1']).toBeUndefined();
    expect(state.dialogs).toEqual([]);
    expect(state.isConfirmingPopDialogActive).toBe(false);
    expect(state.confirmingDialogProps).toBeUndefined();
    expect(localStorage.getItem('ikuyo-storage')).not.toContain(
      'Private trip title',
    );
  });

  it('clears cached admin data when the same user loses the admin role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => JSON.stringify({ user: { ...user, role: 'user' } }),
      })),
    );

    const unsubscribe = useBoundStore.getState().subscribeUser();
    await waitFor(() =>
      expect(useBoundStore.getState().currentUser?.role).toBe('user'),
    );
    unsubscribe();

    const state = useBoundStore.getState();
    expect(state.trip['trip-1']).toBeUndefined();
    expect(state.dialogs).toEqual([]);
    expect(state.authUser?.id).toBe(user.id);
    expect(localStorage.getItem('ikuyo-storage')).not.toContain(
      'Private trip title',
    );
  });

  it('clears cached admin data on an explicit same-user refresh', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => JSON.stringify({ user: { ...user, role: 'user' } }),
      })),
    );

    await useBoundStore.getState().refreshCurrentUser();

    const state = useBoundStore.getState();
    expect(state.currentUser?.role).toBe('user');
    expect(state.authUser?.id).toBe(user.id);
    expect(state.trip['trip-1']).toBeUndefined();
    expect(state.dialogs).toEqual([]);
  });

  it('evicts a denied trip and its content while keeping the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'Forbidden' }),
      })),
    );

    useBoundStore.getState().refreshTrip('trip-1');
    await waitFor(() =>
      expect(useBoundStore.getState().trip['trip-1']).toBeUndefined(),
    );

    const state = useBoundStore.getState();
    expect(state.currentUser?.id).toBe(user.id);
    expect(state.activity['activity-1']).toBeUndefined();
    expect(state.dialogs).toEqual([]);
    expect(state.isConfirmingPopDialogActive).toBe(false);
    expect(state.confirmingDialogProps).toBeUndefined();
    expect(state.trips['user-1']).toEqual([]);
    expect(state.tripMeta['trip-1']?.error).toBe('Forbidden');
    expect(localStorage.getItem('ikuyo-storage')).not.toContain(
      'Private trip title',
    );
  });

  it('starts a new trip request after the session changes', async () => {
    const denied = {
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ message: 'Forbidden' }),
    };
    let releaseOld!: (response: typeof denied) => void;
    const oldResponse = new Promise<typeof denied>((resolve) => {
      releaseOld = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => oldResponse)
      .mockResolvedValueOnce(denied);
    vi.stubGlobal('fetch', fetchMock);

    useBoundStore.getState().refreshTrip('trip-1');
    useBoundStore.getState().clearSession();
    useBoundStore.setState({ currentUser: { ...user, id: 'user-2' } });
    useBoundStore.getState().refreshTrip('trip-1');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    releaseOld(denied);
    await waitFor(() =>
      expect(useBoundStore.getState().tripMeta['trip-1']?.error).toBe(
        'Forbidden',
      ),
    );
    expect(useBoundStore.getState().currentUser?.id).toBe('user-2');
  });
});
