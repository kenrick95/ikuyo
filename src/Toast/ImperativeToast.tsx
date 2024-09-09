import * as ToastPrimitive from '@radix-ui/react-toast';
import { useBoundStore } from '../data/store';
import s from './Toast.module.css';

export const ImperativeToastRoot = () => {
  const toasts = useBoundStore((state) => state.toasts);

  console.log('ImperativeToastRoot| toasts', toasts);
  return (
    <ToastPrimitive.Provider>
      {toasts.map((toastConfig, index) => (
        <ToastPrimitive.Root
          key={index}
          className={s.ToastRoot}
          {...toastConfig.root}
        >
          {toastConfig.title ? (
            <ToastPrimitive.Title
              className={s.ToastTitle}
              {...toastConfig.title}
            />
          ) : null}
          {toastConfig.description ? (
            <ToastPrimitive.Description
              className={s.ToastDescription}
              {...toastConfig.description}
            />
          ) : null}
          {toastConfig.action ? (
            <ToastPrimitive.Action
              className={s.ToastAction}
              {...toastConfig.action}
            />
          ) : null}
          {toastConfig.close ? (
            <ToastPrimitive.Close
              className={s.ToastClose}
              aria-label="Close"
              {...toastConfig.close}
            >
              ×
            </ToastPrimitive.Close>
          ) : null}
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className={s.ToastViewport} />
    </ToastPrimitive.Provider>
  );
};
