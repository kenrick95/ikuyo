import {
  ToastActionProps,
  ToastCloseProps,
  ToastDescriptionProps,
  ToastTitleProps,
  ToastProps,
} from '@radix-ui/react-toast';
import { createContext } from 'react';

export type ToastConfig = {
  root: Omit<ToastProps, 'children'>;
  title?: ToastTitleProps;
  description?: ToastDescriptionProps;
  action?: ToastActionProps;
  close?: ToastCloseProps;
};
export const ToastConfigContext = createContext<ToastConfig[]>([]);

export function useToast() {
  function publishToast(toastConfig: ToastConfig) {
    // TODO: ... setState to ToastConfigContext.Provider?
    // how to pass data to ImperativeToastRoot so it can be consumed there?
    console.log('toastConfig', toastConfig);
  }
  return {
    publish: publishToast,
  };
}
