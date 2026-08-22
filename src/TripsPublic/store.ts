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
          const page = await get<
            | CursorPage<ApiPublicTrip>
            | { data: ApiPublicTrip[]; next_page_url?: string | null }
          >(`/api/trips/public?${query.toString()}`);
          if (disposed) return;
          const rows = page.data.map((trip) => ({ ...trip }));
          const hasMore =
            'hasMore' in page ? page.hasMore : Boolean(page.next_page_url);
          nextCursor = 'nextCursor' in page ? page.nextCursor : null;
          set((state) => ({
            tripsPublic: append ? [...state.tripsPublic, ...rows] : rows,
            tripsPublicLoading: false,
            tripsPublicLoadingMore: false,
            tripsPublicHasMore: hasMore,
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
