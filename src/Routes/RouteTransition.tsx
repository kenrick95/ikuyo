import { type ComponentProps, useContext, ViewTransition } from 'react';
import { RouteMotionContext } from './TransitionRouter';

/** Keep Suspense reveals subject to the same policy as navigation. */
export function RouteTransition(props: ComponentProps<typeof ViewTransition>) {
  const enabled = useContext(RouteMotionContext);
  return (
    <ViewTransition
      {...props}
      {...(!enabled
        ? {
            default: 'none',
            enter: 'none',
            exit: 'none',
            update: 'none',
            share: 'none',
          }
        : {})}
    />
  );
}
