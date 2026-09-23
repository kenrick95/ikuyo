import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { Router } from 'wouter';
import { navigate as browserNavigate } from 'wouter/use-browser-location';

type NavigationOptions = Parameters<typeof browserNavigate>[1];
type Snapshot = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
};
type RouteContextValue = {
  snapshot: Snapshot;
  navigate: typeof browserNavigate;
};
const RouteContext = createContext<RouteContextValue | null>(null);
export const RouteMotionContext = createContext(false);

function readLocation(): Snapshot {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state,
  };
}

// Detail routes use Radix's own animation and focus lifecycle.
export function isDialogRoute(pathname: string): boolean {
  return (
    /^\/trip\/[^/]+\/(?:list|timetable)\/(?:activity|accommodation|macroplan)\/[^/]+\/?$/.test(
      pathname,
    ) || /^\/trip\/[^/]+\/tasks\/task\/[^/]+\/?$/.test(pathname)
  );
}

function isAuthOrAccountRoute(pathname: string): boolean {
  return /^\/(?:login|account)(?:\/|$)/.test(pathname);
}

function canAnimate(from: string, to: string): boolean {
  return (
    from !== to &&
    !isDialogRoute(from) &&
    !isDialogRoute(to) &&
    !isAuthOrAccountRoute(from) &&
    !isAuthOrAccountRoute(to) &&
    typeof document.startViewTransition === 'function' &&
    document.visibilityState !== 'hidden' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function useRouteContext() {
  const context = useContext(RouteContext);
  if (!context) throw new Error('Missing TransitionRouter');
  return context;
}

function useRouteLocation(): [string, typeof browserNavigate] {
  const { snapshot, navigate } = useRouteContext();
  return [snapshot.pathname, navigate];
}

function useRouteSearch() {
  return useRouteContext().snapshot.search;
}

export function useRouteSnapshot() {
  return useRouteContext().snapshot;
}

export function TransitionRouter({
  children,
  beforeNavigate,
  transitions = true,
}: {
  children: ReactNode;
  beforeNavigate?: () => void;
  transitions?: boolean;
}) {
  const [snapshot, setSnapshot] = useState(readLocation);
  const [pending, startTransition] = useTransition();
  const ownNavigation = useRef(false);
  const committed = useRef(snapshot);
  useLayoutEffect(() => {
    committed.current = snapshot;
  }, [snapshot]);

  // Wouter patches pushState/replaceState once and emits these notifications.
  // Only this owner subscribes; nested routers consume the React context.
  useLayoutEffect(() => {
    const onHistory = () => {
      if (ownNavigation.current) return;
      setSnapshot(readLocation());
    };
    const events = ['popstate', 'hashchange', 'pushState', 'replaceState'];
    for (const event of events) window.addEventListener(event, onHistory);
    return () => {
      for (const event of events) window.removeEventListener(event, onHistory);
    };
  }, []);

  const navigate = useCallback(
    (to: string | URL, options?: NavigationOptions) => {
      const previous = window.location.pathname;
      beforeNavigate?.();
      ownNavigation.current = true;
      try {
        browserNavigate(to, options);
      } finally {
        ownNavigation.current = false;
      }
      const next = readLocation();
      const animate =
        transitions &&
        options?.transition !== false &&
        canAnimate(previous, next.pathname) &&
        !isDialogRoute(committed.current.pathname);
      if (animate) startTransition(() => setSnapshot(next));
      else setSnapshot(next);
    },
    [beforeNavigate, transitions],
  );

  const [motionAllowed, setMotionAllowed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () =>
      setMotionAllowed(
        !preference.matches && document.visibilityState !== 'hidden',
      );
    update();
    preference.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      preference.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const value = useMemo(() => ({ snapshot, navigate }), [snapshot, navigate]);
  return (
    <RouteContext.Provider value={value}>
      <RouteMotionContext.Provider
        value={
          transitions &&
          motionAllowed &&
          !isDialogRoute(snapshot.pathname) &&
          !isAuthOrAccountRoute(snapshot.pathname)
        }
      >
        <Router hook={useRouteLocation} searchHook={useRouteSearch}>
          {pending ? (
            <div role="status" className="route-pending">
              Loading page…
            </div>
          ) : null}
          {children}
        </Router>
      </RouteMotionContext.Provider>
    </RouteContext.Provider>
  );
}
