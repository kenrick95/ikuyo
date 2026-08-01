import * as ToastPrimitive from '@radix-ui/react-toast';
import { Portal, Theme } from '@radix-ui/themes';
import { memo, useCallback, useRef } from 'react';
import { useDeepBoundStore } from '../data/store';
import { ThemeAppearance } from '../theme/constants';
import { useTheme } from '../theme/hooks';
import s from './Toast.module.css';

export const ImperativeToastRoot = memo(
  () => {
    const theme = useTheme();
    const toasts = useDeepBoundStore((state) => state.toasts);
    const toastContainerRef = useRef<HTMLDivElement>(null);

    const setToastContainerRef = useCallback((el: HTMLDivElement | null) => {
      toastContainerRef.current = el;
      if (el) {
        el.showPopover();
      }
      return () => {
        if (toastContainerRef.current) {
          toastContainerRef.current.hidePopover();
        }
      };
    }, []);

    console.log('ImperativeToastRoot| toasts', toasts);
    return (
      <Portal className={s.notificationArea} asChild>
        <Theme
          appearance={theme === ThemeAppearance.Dark ? 'dark' : 'light'}
          ref={setToastContainerRef}
          popover="manual"
          accentColor="red"
        >
          <ToastPrimitive.Provider duration={2500}>
            {toasts.map((toastConfig) => (
              <ToastPrimitive.Root
                key={`${toastConfig.uid}`}
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
        </Theme>
      </Portal>
    );
  },
  () => true,
);
