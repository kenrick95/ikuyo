import type { StateCreator } from 'zustand';
import { type CursorPage, get } from '../data/apiClient';
import type { BoundStoreType } from '../data/store';

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

type ApiPublicTrip = {
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

/** Coerce MySQL BIGINT ms fields that may arrive as JSON strings. */
function coercePublicTrip(trip: ApiPublicTrip): TripsPublicSliceTrip {
  return {
    ...trip,
    timestampStart: Number(trip.timestampStart),
    timestampEnd: Number(trip.timestampEnd),
    createdAt: Number(trip.createdAt),
    lastUpdatedAt: Number(trip.lastUpdatedAt),
  };
}

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
> = (set, getState) => {
  return {
    tripsPublic: [],
    tripsPublicLoading: true,
    tripsPublicError: null,
    tripsPublicHasMore: null,
    tripsPublicLoadMore: undefined,
    tripsPublicLoadingMore: null,
    subscribeTripsPublic: () => {
      let disposed = false;
      let nextCursor: string | null = null;

      const load = async (append: boolean): Promise<void> => {
        if (disposed) return;
        set(() => ({
          ...(append
            ? { tripsPublicLoadingMore: true }
            : { tripsPublicLoading: true, tripsPublicError: null }),
        }));
        try {
          const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
          if (nextCursor) query.set('cursor', nextCursor);
          const page = await get<CursorPage<ApiPublicTrip>>(
            `/api/trips/public?${query.toString()}`,
          );
          if (disposed) return;
          nextCursor = page.nextCursor;
          set((state) => ({
            tripsPublic: append
              ? [...state.tripsPublic, ...page.data.map(coercePublicTrip)]
              : page.data.map(coercePublicTrip),
            tripsPublicLoading: false,
            tripsPublicLoadingMore: false,
            tripsPublicHasMore: page.hasMore,
          }));
        } catch (error) {
          if (disposed) return;
          set(() => ({
            tripsPublicLoading: false,
            tripsPublicLoadingMore: false,
            tripsPublicHasMore: null,
            tripsPublicError:
              error instanceof Error
                ? error.message
                : 'Unable to load public trips',
          }));
        }
      };

      void load(false);
      set(() => ({
        tripsPublicLoadMore: () => {
          if (
            getState().tripsPublicLoadingMore ||
            !getState().tripsPublicHasMore
          )
            return;
          void load(true);
        },
      }));
      return () => {
        disposed = true;
        set(() => ({ tripsPublicLoadMore: undefined }));
      };
    },
  };
};
