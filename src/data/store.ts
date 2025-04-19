import { create } from 'zustand';
import { type ToastSlice, createToastSlice } from '../Toast/hooks';

export type BoundStoreType = ToastSlice;

export const useBoundStore = create<BoundStoreType>()((...a) => ({
  ...createToastSlice(...a),
}));
