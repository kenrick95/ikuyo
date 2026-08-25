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
};

type ApiTrip = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  createdAt: number;
  lastUpdatedAt: number;
};

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
  subscribeTrips: (currentUserId, now) => {
    const queryKey = getQueryKey(currentUserId);
    let disposed = false;
    let pastCursor: string | null = null;
    let activeTrips: TripsSliceTrip[] = [];
    let pastTrips: TripsSliceTrip[] = [];
    let activeLoaded = false;
    let pastLoaded = false;

    const toTrip = (trip: ApiTrip): TripsSliceTrip => ({
      ...trip,
      // MySQL BIGINT ms fields can be JSON strings; coerce so TripCard's
      // Temporal.Instant.fromEpochMilliseconds does not fail.
      timestampStart: Number(trip.timestampStart),
      timestampEnd: Number(trip.timestampEnd),
      createdAt: Number(trip.createdAt),
      lastUpdatedAt: Number(trip.lastUpdatedAt),
    });
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
          pastTrips = [...pastTrips, ...page.data.map(toTrip)];
          pastCursor = page.nextCursor;
          pastLoaded = true;
          set(() => ({ tripsHasMore: page.hasMore, tripsLoadingMore: false }));
        } else {
          activeTrips = page.data.map(toTrip);
          activeLoaded = true;
        }
        merge();
      } catch (error) {
        if (disposed) return;
        if (activeLoaded && pastLoaded) {
          set(() => ({
            tripsLoading: false,
            tripsLoadingMore: false,
            tripsError:
              error instanceof Error ? error.message : 'Unable to load trips',
          }));
        }
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
