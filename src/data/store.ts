import { create } from 'zustand';
import { createToastSlice, ToastSlice } from '../Toast/hooks';
import { DbSlice, createDbSlice } from './db';

export type BoundStoreType = ToastSlice & DbSlice;

export const useBoundStore = create<BoundStoreType>()((...a) => ({
  ...createToastSlice(...a),
  ...createDbSlice(...a),
}));
