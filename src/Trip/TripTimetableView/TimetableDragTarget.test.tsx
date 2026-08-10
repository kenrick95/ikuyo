import { Theme } from '@radix-ui/themes';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TimetableDragTarget } from './TimetableDragTarget';

vi.mock('../store/hooks', () => ({
  useTripTimetableDragging: () => ({
    timetableDragging: { source: { mode: undefined } },
  }),
}));

class MockIntersectionObserver {
  constructor(readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as never,
    );
  }

  unobserve() {}
}

describe('TimetableDragTarget', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('opens its context menu when its cell is right-clicked', async () => {
    render(
      <Theme>
        <TimetableDragTarget
          day={1}
          timeStr="0900"
          columnStr="d1-c1"
          gridStyle={{}}
          scrollContainerRef={{ current: null }}
          userCanModifyTrip={true}
          onNewActivity={vi.fn()}
          onNewFlight={vi.fn()}
          onNewTrain={vi.fn()}
          onNewAccommodation={vi.fn()}
          onNewMacroplan={vi.fn()}
        />
      </Theme>,
    );

    const cell = document.querySelector('[data-grid-cell]');
    expect(cell).not.toBeNull();
    expect(cell).toHaveAttribute('data-state', 'closed');

    fireEvent.contextMenu(cell as HTMLElement);

    expect(
      await screen.findByRole('menuitem', { name: 'New activity' }),
    ).toBeVisible();
  });
});
