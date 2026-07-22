import type * as React from 'react';
import type { StateCreator } from 'zustand';
import type { BoundStoreType } from '../data/store';

interface DialogConfirmPopDialogProps {
  title?: string;
  description?: string;
  /** to confirm the closure, i.e. descructive action; e.g. 'discard changes' */
  primaryButtonText?: string;
  /** to cancel the confirmation, i.e. go back; e.g. 'Keep editing' */
  secondaryButtonText?: string;
}

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

  askToConfirmPopDialog: (props?: DialogConfirmPopDialogProps) => void;
  cancelConfirmPopDialog: () => void;
  confirmPopDialog: () => void;
  isConfirmingPopDialogActive: boolean;
  confirmingDialogProps?: DialogConfirmPopDialogProps;
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
          isConfirmingPopDialogActive: false,
          confirmingDialogProps: undefined,
          dialogs: [...state.dialogs, { component, props: props ?? {} }],
        };
      });
    },
    popDialog: () => {
      set((state) => {
        return {
          isConfirmingPopDialogActive: false,
          confirmingDialogProps: undefined,
          dialogs: state.dialogs.slice(0, -1),
        };
      });
    },
    askToConfirmPopDialog: (props?: DialogConfirmPopDialogProps) => {
      set(() => {
        return {
          isConfirmingPopDialogActive: true,
          confirmingDialogProps: props,
        };
      });
    },
    cancelConfirmPopDialog: () => {
      set(() => {
        return {
          isConfirmingPopDialogActive: false,
          confirmingDialogProps: undefined,
        };
      });
    },
    confirmPopDialog: () => {
      set((state) => {
        return {
          isConfirmingPopDialogActive: false,
          dialogs: state.dialogs.slice(0, -1),
          confirmingDialogProps: undefined,
        };
      });
    },
    isConfirmingPopDialogActive: false,
  };
};
