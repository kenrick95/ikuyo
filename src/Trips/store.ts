import type { StateCreator } from 'zustand';
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
  trips: {
    [queryKey: string]: TripsSliceTrip[];
  };
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
export const createTripsSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripsSlice
> = (set, get) => {
  return {
    trips: {},
    tripsLoading: true,
    tripsError: null,
    tripsHasMore: null,
    tripsLoadMore: undefined,
    tripsLoadingMore: null,
    subscribeTrips: (currentUserId: string, now: number) => {
      const queryKey = getQueryKey(currentUserId);
      const PAGE_SIZE = 10;

      // Internal caches — merged into `trips` whenever either subscription fires
      let activeTrips: TripsSliceTrip[] = [];
      let pastTrips: TripsSliceTrip[] = [];
      let activeLoaded = false;
      let pastLoaded = false;

      const mergeAndSet = () => {
        if (!activeLoaded || !pastLoaded) return;
        set((state) => ({
          trips: {
            ...state.trips,
            [queryKey]: [...activeTrips, ...pastTrips],
          },
          tripsLoading: false,
        }));
      };

      // Subscription 1: active trips (ongoing + upcoming) — load all, no pagination
      const unsubscribeActive = db.subscribeQuery(
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
            console.error('subscribeTrips (active) error', error);
            set(() => ({
              tripsLoading: false,
              tripsError: error.message,
            }));
            return;
          }
          activeTrips =
            data?.trip?.map((trip) => ({
              id: trip.id,
              title: trip.title,
              timestampStart: trip.timestampStart,
              timestampEnd: trip.timestampEnd,
              timeZone: trip.timeZone,
              createdAt: trip.createdAt,
              lastUpdatedAt: trip.lastUpdatedAt,
            })) ?? [];
          activeLoaded = true;
          mergeAndSet();
        },
      );

      // Subscription 2: past trips — paginated
      const pastQuery = db.subscribeInfiniteQuery(
        {
          trip: {
            $: {
              limit: PAGE_SIZE,
              order: {
                timestampEnd: 'desc',
              },
              where: {
                'tripUser.user.id': currentUserId,
                timestampEnd: { $lt: now },
              },
            },
          },
        },
        ({ data, error, canLoadNextPage }) => {
          if (error) {
            console.error('subscribeTrips (past) error', error);
            set(() => ({
              tripsLoading: false,
              tripsError: error.message,
              tripsHasMore: null,
              tripsLoadingMore: null,
            }));
            return;
          }
          pastTrips =
            data?.trip?.map((trip) => ({
              id: trip.id,
              title: trip.title,
              timestampStart: trip.timestampStart,
              timestampEnd: trip.timestampEnd,
              timeZone: trip.timeZone,
              createdAt: trip.createdAt,
              lastUpdatedAt: trip.lastUpdatedAt,
            })) ?? [];
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
        unsubscribeActive();
        pastQuery.unsubscribe();
      };
    },
    getTripsGrouped: (currentUserId: string | undefined, now: number) => {
      const groups: Record<TripGroupType, TripsSliceTrip[]> = {
        [TripGroup.Upcoming]: [],
        [TripGroup.Ongoing]: [],
        [TripGroup.Past]: [],
      };
      if (!currentUserId) {
        return groups;
      }

      const state = get();
      const queryKey = getQueryKey(currentUserId);
      const trips = state.trips[queryKey] ?? [];
      for (const trip of trips) {
        if (trip.timestampStart > now) {
          groups[TripGroup.Upcoming].push(trip);
        } else if (trip.timestampEnd < now) {
          groups[TripGroup.Past].push(trip);
        } else {
          groups[TripGroup.Ongoing].push(trip);
        }
      }

      groups[TripGroup.Upcoming].sort(sortTripFn);
      groups[TripGroup.Ongoing].sort(sortTripFn);
      groups[TripGroup.Past].sort(sortTripFn).reverse();

      return groups;
    },
  };
};

function getQueryKey(currentUserId: string): string {
  return JSON.stringify({
    tripUser: currentUserId,
  });
}

function sortTripFn(tripA: TripsSliceTrip, tripB: TripsSliceTrip): number {
  if (tripA.timestampStart === tripB.timestampStart) {
    if (tripA.timestampEnd === tripB.timestampEnd) {
      return 0;
    }
    return tripA.timestampEnd - tripB.timestampEnd;
  }
  return tripA.timestampStart - tripB.timestampStart;
}
