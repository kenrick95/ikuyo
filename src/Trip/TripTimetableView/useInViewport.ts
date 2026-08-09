import { type RefObject, useEffect, useState } from 'react';

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

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { root: root.current, rootMargin },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [ref, root, rootMargin]);

  return isInViewport;
}
