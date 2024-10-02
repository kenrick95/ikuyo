import { forwardRef, Suspense } from 'react';

import { Text } from '@radix-ui/themes';

export function withLoading(
  {
    fallback,
  }: {
    fallback: () => React.ReactNode;
  } = {
    fallback: () => <Text size="3">Loading...</Text>,
  }
) {
  return function withLoadingInner<T extends object>(
    Component: React.ComponentType<T>
  ): React.ForwardRefExoticComponent<
    React.PropsWithoutRef<T> & React.RefAttributes<unknown>
  > {
    return forwardRef(function ComponentWithLoading(props: T, ref) {
      return (
        <Suspense fallback={fallback()}>
          <Component ref={ref} {...props} />
        </Suspense>
      );
    });
  };
}
