import type {
  ToastActionProps,
  ToastCloseProps,
  ToastDescriptionProps,
  ToastProps,
  ToastTitleProps,
} from '@radix-ui/react-toast';
import type { StateCreator } from 'zustand';
import type { BoundStoreType } from '../data/store';

export type ToastConfig = {
  root: Omit<ToastProps, 'children'>;
  title?: ToastTitleProps;
  description?: ToastDescriptionProps;
  action?: ToastActionProps;
  close?: ToastCloseProps;
  uid?: string;
};
export interface ToastSlice {
  toasts: Array<ToastConfig>;
  publishToast: (newToast: ToastConfig) => void;
  resetToast: () => void;
}

export const createToastSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  ToastSlice
> = (set) => {
  return {
    toasts: [],
    publishToast: (newToast: ToastConfig) => {
      set((state) => {
        if (!newToast.uid) {
          const uid =
            crypto.randomUUID() ?? Math.random().toString(36).slice(2);
          newToast.uid = uid;
        }
        return {
          toasts: [...state.toasts, newToast],
        };
      });
    },
    resetToast: () => {
      set(() => {
        return {
          toasts: [],
        };
      });
    },
  };
};
