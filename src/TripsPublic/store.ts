import type { StateCreator } from 'zustand';
import { type CursorPage, get } from '../data/apiClient';
import { backendTripReads } from '../data/backendConfig';
import { db } from '../data/db';
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
      if (!backendTripReads) {
        return subscribeTripsPublicInstant(set);
      }
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
              ? [...state.tripsPublic, ...page.data]
              : page.data,
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

/** Original InstantDB-backed public-trip directory (default when backend reads are disabled). */
function subscribeTripsPublicInstant(
  set: (fn: (state: any) => Partial<TripsPublicSlice>) => void,
): () => void {
  const query = db.subscribeInfiniteQuery(
    {
      trip: {
        $: {
          limit: PAGE_SIZE,
          order: { serverCreatedAt: 'desc' },
          where: { sharingLevel: 3 },
        },
        tripUser: { $: { where: { role: 'owner' } }, user: {} },
        activity: {},
      },
    },
    ({ data, error, canLoadNextPage }) => {
      if (error) {
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
  return () => query.unsubscribe();
}
