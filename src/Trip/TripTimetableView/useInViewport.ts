import { type RefObject, useEffect, useState } from 'react';

/**
 * Key: root
 * Value: Map<rootMargin, cached observer and target callbacks>
 */
const rootToMap = new WeakMap<
  RefObject<HTMLElement | null>,
  Map<string, CachedObserver>
>();

interface CachedObserver {
  observer: IntersectionObserver;
  targetToCallback: Map<Element, (isInViewport: boolean) => void>;
}

/**
 * Reports whether `ref`'s element intersects (or is within `rootMargin` of)
 * the given scroll container. Used to lazily mount heavy DOM (e.g. the
 * timetable drag targets) so long trips don't render every cell up front.
 */
export function useInViewport(
  ref: RefObject<HTMLElement | null>,
  root: RefObject<HTMLElement | null>,
  rootMargin = '400px',
): boolean {
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const rootMarginToObserverMap = rootToMap.get(root) ?? new Map();
    let cachedObserver = rootMarginToObserverMap.get(rootMargin);

    if (!cachedObserver) {
      const targetToCallback = new Map<
        Element,
        (isInViewport: boolean) => void
      >();
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            targetToCallback.get(entry.target)?.(entry.isIntersecting);
          }
        },
        { root: root.current, rootMargin },
      );
      cachedObserver = { observer, targetToCallback };
      rootMarginToObserverMap.set(rootMargin, cachedObserver);
      rootToMap.set(root, rootMarginToObserverMap);
    }

    cachedObserver.targetToCallback.set(target, setIsInViewport);
    cachedObserver.observer.observe(target);

    return () => {
      cachedObserver.targetToCallback.delete(target);
      cachedObserver.observer.unobserve(target);
    };
  }, [ref, root, rootMargin]);

  return isInViewport;
}
