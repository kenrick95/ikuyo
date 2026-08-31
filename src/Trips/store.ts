import type { StateCreator } from 'zustand';
import { type CursorPage, get } from '../data/apiClient';
import type { BoundStoreType } from '../data/store';
import { TripGroup, type TripGroupType } from '../Trip/TripGroup';

export type TripsSliceTrip = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  createdAt: number;
  lastUpdatedAt: number;
  archivedAt?: number | null;
};
export type TripsSlice = {
  trips: { [queryKey: string]: TripsSliceTrip[] };
  tripsLoading: boolean;
  tripsError: string | null;
  subscribeTrips: (currentUserId: string, now: number) => () => void;
  getTripsGrouped: (
    currentUserId: string | undefined,
    now: number,
  ) => Record<TripGroupType, TripsSliceTrip[]>;
  tripsHasMore: null | boolean;
  tripsLoadMore: undefined | (() => void);
  tripsLoadingMore: null | boolean;
  archivedTrips: { [queryKey: string]: TripsSliceTrip[] };
  archivedTripsLoading: boolean;
  archivedTripsError: string | null;
  archivedTripsHasMore: null | boolean;
  archivedTripsLoadMore: undefined | (() => void);
  archivedTripsLoadingMore: null | boolean;
  subscribeArchivedTrips: (currentUserId: string) => () => void;
};

type ApiTrip = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  createdAt: number;
  lastUpdatedAt: number;
  archivedAt?: number;
};

function toTripsSliceTrip(trip: ApiTrip): TripsSliceTrip {
  return {
    ...trip,
    // MySQL BIGINT ms fields can be JSON strings; coerce so TripCard's
    // Temporal.Instant.fromEpochMilliseconds does not fail.
    timestampStart: Number(trip.timestampStart),
    timestampEnd: Number(trip.timestampEnd),
    createdAt: Number(trip.createdAt),
    lastUpdatedAt: Number(trip.lastUpdatedAt),
    archivedAt: trip.archivedAt == null ? undefined : Number(trip.archivedAt),
  };
}

export const createTripsSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripsSlice
> = (set, getState) => ({
  trips: {},
  tripsLoading: true,
  tripsError: null,
  tripsHasMore: null,
  tripsLoadMore: undefined,
  tripsLoadingMore: null,
  archivedTrips: {},
  archivedTripsLoading: false,
  archivedTripsError: null,
  archivedTripsHasMore: null,
  archivedTripsLoadMore: undefined,
  archivedTripsLoadingMore: null,
  subscribeTrips: (currentUserId, now) => {
    const queryKey = getQueryKey(currentUserId);
    let disposed = false;
    let pastCursor: string | null = null;
    let activeTrips: TripsSliceTrip[] = [];
    let pastTrips: TripsSliceTrip[] = [];
    let activeLoaded = false;
    let pastLoaded = false;

    const merge = () => {
      if (disposed || !activeLoaded || !pastLoaded) return;
      set((state) => ({
        trips: { ...state.trips, [queryKey]: [...activeTrips, ...pastTrips] },
        tripsLoading: false,
      }));
    };
    const load = async (append = false): Promise<void> => {
      try {
        const params = new URLSearchParams({
          now: String(now),
          status: append ? 'past' : 'active',
          limit: append ? '10' : '100',
        });
        if (append && pastCursor) params.set('cursor', pastCursor);
        const page = await get<CursorPage<ApiTrip>>(`/api/trips?${params}`);
        if (disposed) return;
        if (append) {
          pastTrips = [...pastTrips, ...page.data.map(toTripsSliceTrip)];
          pastCursor = page.nextCursor;
          pastLoaded = true;
          set(() => ({ tripsHasMore: page.hasMore, tripsLoadingMore: false }));
        } else {
          activeTrips = page.data.map(toTripsSliceTrip);
          activeLoaded = true;
        }
        merge();
      } catch (error) {
        if (disposed) return;
        // The initial active/past requests run concurrently. An error in either
        // one must dismiss the initial spinner; otherwise the list is stuck
        // loading forever when only one request fails.
        set(() => ({
          tripsLoading: false,
          tripsLoadingMore: false,
          tripsError:
            error instanceof Error ? error.message : 'Unable to load trips',
        }));
      }
    };

    set(() => ({
      tripsLoading: true,
      tripsError: null,
      tripsLoadingMore: false,
    }));
    void Promise.all([load(false), load(true)]);
    set(() => ({
      tripsLoadMore: () => {
        const state = getState();
        if (state.tripsLoadingMore || !state.tripsHasMore) return;
        set(() => ({ tripsLoadingMore: true }));
        void load(true);
      },
    }));
    return () => {
      disposed = true;
      set(() => ({ tripsLoadMore: undefined }));
    };
  },
  subscribeArchivedTrips: (currentUserId) => {
    const queryKey = getQueryKey(currentUserId);
    let disposed = false;
    let cursor: string | null = null;
    let archivedTrips: TripsSliceTrip[] = [];
    const load = async (append = false): Promise<void> => {
      try {
        const params = new URLSearchParams({
          status: 'archived',
          limit: append ? '10' : '100',
        });
        if (append && cursor) params.set('cursor', cursor);
        const page = await get<CursorPage<ApiTrip>>(`/api/trips?${params}`);
        if (disposed) return;
        archivedTrips = append
          ? [...archivedTrips, ...page.data.map(toTripsSliceTrip)]
          : page.data.map(toTripsSliceTrip);
        cursor = page.nextCursor;
        set((state) => ({
          archivedTrips: { ...state.archivedTrips, [queryKey]: archivedTrips },
          archivedTripsLoading: false,
          archivedTripsLoadingMore: false,
          archivedTripsHasMore: page.hasMore,
        }));
      } catch (error: unknown) {
        if (disposed) return;
        set(() => ({
          archivedTripsLoading: false,
          archivedTripsLoadingMore: false,
          archivedTripsError:
            error instanceof Error
              ? error.message
              : 'Unable to load archived trips',
        }));
      }
    };
    set(() => ({
      archivedTripsLoading: true,
      archivedTripsError: null,
      archivedTripsLoadingMore: false,
    }));
    void load();
    set(() => ({
      archivedTripsLoadMore: () => {
        const state = getState();
        if (state.archivedTripsLoadingMore || !state.archivedTripsHasMore)
          return;
        set(() => ({ archivedTripsLoadingMore: true }));
        void load(true);
      },
    }));
    return () => {
      disposed = true;
      set(() => ({ archivedTripsLoadMore: undefined }));
    };
  },
  getTripsGrouped: (currentUserId, now) => {
    const groups: Record<TripGroupType, TripsSliceTrip[]> = {
      [TripGroup.Upcoming]: [],
      [TripGroup.Ongoing]: [],
      [TripGroup.Past]: [],
    };
    if (!currentUserId) return groups;
    for (const trip of getState().trips[getQueryKey(currentUserId)] ?? []) {
      if (trip.timestampStart > now) groups[TripGroup.Upcoming].push(trip);
      else if (trip.timestampEnd < now) groups[TripGroup.Past].push(trip);
      else groups[TripGroup.Ongoing].push(trip);
    }
    groups[TripGroup.Upcoming].sort(sortTripFn);
    groups[TripGroup.Ongoing].sort(sortTripFn);
    groups[TripGroup.Past].sort(sortTripFn).reverse();
    return groups;
  },
});

function getQueryKey(currentUserId: string): string {
  return JSON.stringify({ tripUser: currentUserId });
}
function sortTripFn(a: TripsSliceTrip, b: TripsSliceTrip): number {
  if (a.timestampStart === b.timestampStart)
    return a.timestampEnd - b.timestampEnd;
  return a.timestampStart - b.timestampStart;
}
