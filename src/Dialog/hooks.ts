import type * as React from 'react';
import type { StateCreator } from 'zustand';
import type { BoundStoreType } from '../data/store';

// Manage the stack of dialogs in the application
export interface DialogSlice {
  /** Last dialog in the array is the one showing */
  dialogs: Array<{
    // biome-ignore lint/suspicious/noExplicitAny: We want to use mixed props between elements
    component: React.ComponentType<any>;
    // biome-ignore lint/suspicious/noExplicitAny: We want to use mixed props between elements
    props: Record<string, any>;
  }>;

  pushDialog: <T extends object>(
    component: React.ComponentType<T>,
    props: T,
  ) => void;
  popDialog: () => void;
  clearDialogs: () => void;
}

export const createDialogSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  DialogSlice
> = (set) => {
  return {
    dialogs: [],
    clearDialogs: () => {
      set(() => {
        return {
          dialogs: [],
        };
      });
    },
    pushDialog: <T extends object>(
      component: React.ComponentType<T>,
      props: T,
    ) => {
      set((state) => {
        return {
          dialogs: [...state.dialogs, { component, props: props ?? {} }],
        };
      });
    },
    popDialog: () => {
      set((state) => {
        return {
          dialogs: state.dialogs.slice(0, -1),
        };
      });
    },
  };
};
