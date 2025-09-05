import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createUserSlice, type UserSlice } from '../Auth/store';
import { useDeepEqual } from '../common/useDeepEqual';
import { createDialogSlice, type DialogSlice } from '../Dialog/hooks';
import { createToastSlice, type ToastSlice } from '../Toast/hooks';
import { createTripSlice } from '../Trip/store/store';
import type { TripSlice } from '../Trip/store/types';
import { createTripsSlice, type TripsSlice } from '../Trips/store';
import { createThemeSlice, type ThemeSlice } from '../theme/store';

export type BoundStoreType = ToastSlice &
  UserSlice &
  DialogSlice &
  TripSlice &
  TripsSlice &
  ThemeSlice;

export const useBoundStore = create<BoundStoreType>()(
  persist(
    (...args) => ({
      ...createToastSlice(...args),
      ...createUserSlice(...args),
      ...createDialogSlice(...args),
      ...createTripSlice(...args),
      ...createTripsSlice(...args),
      ...createThemeSlice(...args),
    }),
    {
      name: 'ikuyo-storage',
      version: 1,
      partialize: (state) => {
        return {
          // Stale-while-revalidate: Don't persist the 'loading' or 'error' fields
          currentUser: state.currentUser,
          authUser: state.authUser,
          trip: state.trip,
          comment: state.comment,
          commentGroup: state.commentGroup,
          commentUser: state.commentUser,
          macroplan: state.macroplan,
          expense: state.expense,
          accommodation: state.accommodation,
          activity: state.activity,
          trips: state.trips,
          tripUser: state.tripUser,
          task: state.task,
          taskList: state.taskList,
          currentTheme: state.currentTheme,
        };
      },
      // biome-ignore lint/suspicious/noExplicitAny: schema migration code
      migrate: (persistedState: any, version) => {
        // Migration from version 0 to 1: Add task and taskList to persisted state
        if (version === 0) {
          return {
            ...persistedState,
            task: {},
            taskList: {},
          };
        }
        return persistedState;
      },
    },
  ),
);

export function useDeepBoundStore<U>(
  selector: (state: BoundStoreType) => U,
): U {
  return useBoundStore(useDeepEqual<BoundStoreType, U>(selector));
}
