import { Spinner } from '@radix-ui/themes';
import type React from 'react';
import { forwardRef, Suspense } from 'react';

export function withLoading(
  { fallback }: { fallback: () => React.ReactNode } = {
    fallback: () => <Spinner m="3" />,
  },
) {
  return function withLoadingInner<T extends object>(
    Component: React.ComponentType<T>,
  ): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<T> & React.RefAttributes<unknown>
  > {
    return forwardRef(function ComponentWithLoading(
      props: React.PropsWithoutRef<T>,
      ref: React.ForwardedRef<unknown>,
    ) {
      const ComponentWithoutRef = Component as React.ComponentType<
        React.PropsWithoutRef<T>
      >;
      return (
        <Suspense fallback={fallback()}>
          <ComponentWithoutRef ref={ref} {...props} />
        </Suspense>
      );
    });
  };
}
