import { useRef } from 'react';
import deepEqual from 'react-fast-compare';

// https://github.com/pmndrs/zustand/discussions/1936#discussioncomment-11851279
export function useDeepEqual<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = useRef<U>(undefined);
  return (state) => {
    const next = selector(state);
    if (deepEqual(prev.current, next)) {
      return prev.current as U;
    }
    prev.current = next;
    return next;
  };
}
