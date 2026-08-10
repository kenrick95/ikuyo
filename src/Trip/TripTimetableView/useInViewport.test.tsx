import { act, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useInViewport } from './useInViewport';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    MockIntersectionObserver.instances.push(this);
  }
}

function ViewportTargets() {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const firstIsInViewport = useInViewport(firstRef, rootRef);
  const secondIsInViewport = useInViewport(secondRef, rootRef);

  return (
    <div ref={rootRef}>
      <div ref={firstRef} data-testid="first">
        {String(firstIsInViewport)}
      </div>
      <div ref={secondRef} data-testid="second">
        {String(secondIsInViewport)}
      </div>
    </div>
  );
}

describe('useInViewport', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('shares an observer while updating each observed target independently', () => {
    render(<ViewportTargets />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);

    const observer = MockIntersectionObserver.instances[0];
    const first = screen.getByTestId('first');
    const second = screen.getByTestId('second');

    act(() => {
      observer.callback(
        [
          {
            isIntersecting: true,
            target: second,
          } as unknown as IntersectionObserverEntry,
        ],
        observer as never,
      );
    });

    expect(first).toHaveTextContent('false');
    expect(second).toHaveTextContent('true');
  });
});
