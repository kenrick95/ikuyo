import {
  ToastActionProps,
  ToastCloseProps,
  ToastDescriptionProps,
  ToastTitleProps,
  ToastProps,
} from '@radix-ui/react-toast';
import type { StateCreator } from 'zustand';

export type ToastConfig = {
  root: Omit<ToastProps, 'children'>;
  title?: ToastTitleProps;
  description?: ToastDescriptionProps;
  action?: ToastActionProps;
  close?: ToastCloseProps;
};
export interface ToastSlice {
  toasts: Array<ToastConfig>;
  publishToast: (newToast: ToastConfig) => void;
  resetToast: () => void;
}

export const createToastSlice: StateCreator<ToastSlice, [], [], ToastSlice> = (
  set
) => {
  return {
    toasts: [],
    publishToast: (newToast: ToastConfig) => {
      set((state) => {
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
