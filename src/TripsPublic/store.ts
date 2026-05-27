import type { StateCreator } from 'zustand';
import { db } from '../data/db';
import type { BoundStoreType } from '../data/store';
import { TripSharingLevel } from '../Trip/tripSharingLevel';

export type TripsPublicSliceTrip = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  timeZone: string;
  createdAt: number;
  lastUpdatedAt: number;
  ownerHandle: string | null;
  activityCount: number;
};

export type TripsPublicSlice = {
  tripsPublic: TripsPublicSliceTrip[];
  tripsPublicLoading: boolean;
  tripsPublicError: string | null;
  tripsPublicHasMore: boolean | null;
  tripsPublicLoadMore: (() => void) | undefined;
  tripsPublicLoadingMore: boolean | null;
  subscribeTripsPublic: () => () => void;
};

const PAGE_SIZE = 12;

export const createTripsPublicSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripsPublicSlice
> = (set) => {
  return {
    tripsPublic: [],
    tripsPublicLoading: true,
    tripsPublicError: null,
    tripsPublicHasMore: null,
    tripsPublicLoadMore: undefined,
    tripsPublicLoadingMore: null,
    subscribeTripsPublic: () => {
      const query = db.subscribeInfiniteQuery(
        {
          trip: {
            $: {
              limit: PAGE_SIZE,
              order: {
                serverCreatedAt: 'desc',
              },
              where: {
                sharingLevel: TripSharingLevel.PublicListed,
                'activity.id': { $isNull: false },
              },
            },
            tripUser: {
              $: { where: { role: 'owner' } },
              user: {},
            },
            activity: {},
          },
        },
        ({ data, error, canLoadNextPage }) => {
          if (error) {
            console.error('subscribeTripsPublic error', error);
            set(() => ({
              tripsPublicLoading: false,
              tripsPublicError: error.message,
              tripsPublicHasMore: null,
              tripsPublicLoadingMore: null,
            }));
            return;
          }
          const trips = (data?.trip ?? []).map((trip) => ({
            id: trip.id,
            title: trip.title,
            timestampStart: trip.timestampStart,
            timestampEnd: trip.timestampEnd,
            timeZone: trip.timeZone,
            createdAt: trip.createdAt,
            lastUpdatedAt: trip.lastUpdatedAt,
            ownerHandle: trip.tripUser?.[0]?.user?.[0]?.handle ?? null,
            activityCount: trip.activity?.length ?? 0,
          }));
          set(() => ({
            tripsPublic: trips,
            tripsPublicLoading: false,
            tripsPublicHasMore: canLoadNextPage ?? null,
            tripsPublicLoadingMore: false,
          }));
        },
      );

      set(() => ({
        tripsPublicLoadMore: () => {
          set(() => ({ tripsPublicLoadingMore: true }));
          query.loadNextPage();
        },
      }));

      return () => {
        query.unsubscribe();
      };
    },
  };
};
