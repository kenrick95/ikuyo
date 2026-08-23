import type { StateCreator } from 'zustand';
import { type CursorPage, get } from '../data/apiClient';
import { backendTripReads } from '../data/backendConfig';
import { db } from '../data/db';
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
    if (!backendTripReads) {
      return subscribeTripsInstant(currentUserId, now, set);
    }
    const queryKey = getQueryKey(currentUserId);
    let disposed = false;
    let pastCursor: string | null = null;
    let activeTrips: TripsSliceTrip[] = [];
    let pastTrips: TripsSliceTrip[] = [];
    let activeLoaded = false;
    let pastLoaded = false;

    const toTrip = (trip: ApiTrip): TripsSliceTrip => ({ ...trip });
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
        set(() => ({
          tripsLoading: activeLoaded && pastLoaded ? false : false,
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

/** Original InstantDB-backed implementation (default when backend trip reads are disabled). */
function subscribeTripsInstant(
  currentUserId: string,
  now: number,
  set: (fn: (state: any) => Partial<TripsSlice>) => void,
): () => void {
  const queryKey = getQueryKey(currentUserId);
  const PAGE_SIZE = 10;
  let activeTrips: TripsSliceTrip[] = [];
  let pastTrips: TripsSliceTrip[] = [];
  let activeLoaded = false;
  let pastLoaded = false;

  const mergeAndSet = () => {
    if (!activeLoaded || !pastLoaded) return;
    set((state) => ({
      trips: { ...state.trips, [queryKey]: [...activeTrips, ...pastTrips] },
      tripsLoading: false,
    }));
  };

  const unsubActive = db.subscribeQuery(
    {
      trip: {
        $: {
          where: {
            'tripUser.user.id': currentUserId,
            timestampEnd: { $gte: now },
          },
        },
      },
    },
    ({ data, error }) => {
      if (error) {
        set(() => ({ tripsLoading: false, tripsError: error.message }));
        return;
      }
      activeTrips = data?.trip?.map(toSliceTrip) ?? [];
      activeLoaded = true;
      mergeAndSet();
    },
  );

  const pastQuery = db.subscribeInfiniteQuery(
    {
      trip: {
        $: {
          limit: PAGE_SIZE,
          order: { timestampEnd: 'desc' },
          where: {
            'tripUser.user.id': currentUserId,
            timestampEnd: { $lt: now },
          },
        },
      },
    },
    ({ data, error, canLoadNextPage }) => {
      if (error) {
        set(() => ({
          tripsLoading: false,
          tripsError: error.message,
          tripsHasMore: null,
          tripsLoadingMore: null,
        }));
        return;
      }
      pastTrips = data?.trip?.map(toSliceTrip) ?? [];
      pastLoaded = true;
      set(() => ({
        tripsHasMore: canLoadNextPage ?? null,
        tripsLoadingMore: false,
      }));
      mergeAndSet();
    },
  );

  set(() => ({
    tripsLoadMore: () => {
      set(() => ({ tripsLoadingMore: true }));
      pastQuery.loadNextPage();
    },
  }));

  return () => {
    unsubActive();
    pastQuery.unsubscribe();
  };
}

function toSliceTrip(trip: {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  createdAt: number;
  lastUpdatedAt: number;
}): TripsSliceTrip {
  return {
    id: trip.id,
    title: trip.title,
    timestampStart: trip.timestampStart,
    timestampEnd: trip.timestampEnd,
    timeZone: trip.timeZone,
    createdAt: trip.createdAt,
    lastUpdatedAt: trip.lastUpdatedAt,
  };
}

function getQueryKey(currentUserId: string): string {
  return JSON.stringify({ tripUser: currentUserId });
}
function sortTripFn(a: TripsSliceTrip, b: TripsSliceTrip): number {
  if (a.timestampStart === b.timestampStart)
    return a.timestampEnd - b.timestampEnd;
  return a.timestampStart - b.timestampStart;
}
