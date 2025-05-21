import type { StateCreator } from 'zustand';
import { db } from '../../data/db';
import { useDeepEqual } from '../../data/hooks';
import { type BoundStoreType, useBoundStore } from '../../data/store';
import { TripGroup, type TripGroupType } from '../TripGroup';

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
    subscribeTrips: (currentUserId: string, now: number) => {
      const queryKey = getQueryKey(currentUserId);
      return db.subscribeQuery(
        {
          trip: {
            $: {
              where: {
                and: [{ 'tripUser.user.id': currentUserId }],
              },
            },
          },
        },
        ({ data, error }) => {
          if (error) {
            console.error('subscribeTrips error', error);
            set(() => ({
              tripsLoading: false,
              tripsError: error.message,
            }));
            return;
          }
          const trips =
            data?.trip?.map((trip) => {
              return {
                id: trip.id,
                title: trip.title,
                timestampStart: trip.timestampStart,
                timestampEnd: trip.timestampEnd,
                timeZone: trip.timeZone,
                createdAt: trip.createdAt,
                lastUpdatedAt: trip.lastUpdatedAt,
              } satisfies TripsSliceTrip;
            }) ?? [];
          set((state) => {
            return {
              trips: { ...state.trips, [queryKey]: trips },
              tripsLoading: false,
            };
          });
        },
      );
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

export function useTripsGrouped(
  currentUserId: string | undefined,
  now: number,
): Record<TripGroupType, TripsSliceTrip[]> {
  const tripGroups = useBoundStore(
    useDeepEqual((state) => {
      return state.getTripsGrouped(currentUserId, now);
    }),
  );
  return tripGroups;
}
