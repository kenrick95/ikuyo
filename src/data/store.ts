import { create } from 'zustand';
import { type UserSlice, createUserSlice } from '../Auth/hooks';
import { type DialogSlice, createDialogSlice } from '../Dialog/hooks';
import { type ToastSlice, createToastSlice } from '../Toast/hooks';

export type BoundStoreType = ToastSlice & UserSlice & DialogSlice;

export const useBoundStore = create<BoundStoreType>()((...args) => ({
  ...createToastSlice(...args),
  ...createUserSlice(...args),
  ...createDialogSlice(...args),
}));
