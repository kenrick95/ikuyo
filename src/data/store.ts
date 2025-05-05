import { create } from 'zustand';
import { type UserSlice, createUserSlice } from '../Auth/hooks';
import { type DialogSlice, createDialogSlice } from '../Dialog/hooks';
import { type ToastSlice, createToastSlice } from '../Toast/hooks';
import {
  type RouteHistorySlice,
  createRouteHistorySlice,
} from '../Routes/hooks';

export type BoundStoreType = ToastSlice &
  UserSlice &
  DialogSlice &
  RouteHistorySlice;

export const useBoundStore = create<BoundStoreType>()((...args) => ({
  ...createRouteHistorySlice(...args),
  ...createToastSlice(...args),
  ...createUserSlice(...args),
  ...createDialogSlice(...args),
}));
