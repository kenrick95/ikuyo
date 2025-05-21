import { create } from 'zustand';
import { createUserSlice, type UserSlice } from '../Auth/store';
import { createDialogSlice, type DialogSlice } from '../Dialog/hooks';
import { createToastSlice, type ToastSlice } from '../Toast/hooks';
import { createTripSlice, type TripSlice } from '../Trip/store';
import { createTripsSlice, type TripsSlice } from '../Trip/Trips/store';

export type BoundStoreType = ToastSlice &
  UserSlice &
  DialogSlice &
  TripSlice &
  TripsSlice;

export const useBoundStore = create<BoundStoreType>()((...args) => ({
  ...createToastSlice(...args),
  ...createUserSlice(...args),
  ...createDialogSlice(...args),
  ...createTripSlice(...args),
  ...createTripsSlice(...args),
}));
