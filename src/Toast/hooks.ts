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
  discardToast: () => void;
}

export const createToastSlice: StateCreator<ToastSlice, [], [], ToastSlice> = (
  set
) => {
  return {
    toasts: [],
    publishToast: (newToast: ToastConfig) => {
      return set((state) => {
        return {
          toasts: [...state.toasts, newToast],
        };
      });
    },
    discardToast: () => {
      return set((state) => {
        const copiedToasts = [...state.toasts];
        copiedToasts.shift();
        return {
          toasts: copiedToasts,
        };
      });
    },
  };
};
