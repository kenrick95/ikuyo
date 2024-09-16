import { create } from 'zustand';
import { createToastSlice, ToastSlice } from '../Toast/hooks';

export type BoundStoreType = ToastSlice;

export const useBoundStore = create<BoundStoreType>()((...a) => ({
  ...createToastSlice(...a),
}));
