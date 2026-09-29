import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TripSliceActivity, TripSliceTrip } from '../Trip/store/types';
import type { TripsSliceTrip } from '../Trips/store';
import type { DbUser } from '../User/db';
import { useBoundStore } from './store';

const user: DbUser = {
  id: 'user-1',
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
  });
}

describe('persisted trip revocation', () => {
  beforeEach(() => {
    useBoundStore.getState().clearSession();
    seedPrivateTrip();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useBoundStore.getState().clearSession();
  });

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
    expect(localStorage.getItem('ikuyo-storage')).not.toContain(
      'Private trip title',
    );
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
    expect(state.trips['user-1']).toEqual([]);
    expect(state.tripMeta['trip-1']?.error).toBe('Forbidden');
    expect(localStorage.getItem('ikuyo-storage')).not.toContain(
      'Private trip title',
    );
  });
});
