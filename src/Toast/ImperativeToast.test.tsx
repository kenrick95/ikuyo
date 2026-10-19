import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { ToastConfig } from './hooks';
import { ImperativeToastRoot } from './ImperativeToast';

vi.mock('../data/store', () => ({
  useDeepBoundStore: (
    selector: (state: { toasts: ToastConfig[] }) => unknown,
  ) =>
    selector({
      toasts: [
        {
          uid: 'saved-trip',
          root: { defaultOpen: true, duration: Infinity },
          title: { children: 'Trip saved' },
          close: {},
        },
      ],
    }),
}));
vi.mock('../theme/hooks', () => ({ useTheme: () => 'light' }));

const originalShowPopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'showPopover',
);
const originalHidePopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'hidePopover',
);

function setPopoverMethods(showPopover: unknown, hidePopover: unknown) {
  Object.defineProperties(HTMLElement.prototype, {
    showPopover: { configurable: true, value: showPopover },
    hidePopover: { configurable: true, value: hidePopover },
  });
}

afterEach(() => {
  cleanup();
  for (const [name, descriptor] of [
    ['showPopover', originalShowPopover],
    ['hidePopover', originalHidePopover],
  ] as const) {
    if (descriptor)
      Object.defineProperty(HTMLElement.prototype, name, descriptor);
    else Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

test.each(['missing', 'show-only', 'hide-only', 'non-callable'])(
  'renders and dismisses toasts with %s Popover methods',
  (mode) => {
    const show = vi.fn();
    const hide = vi.fn();
    setPopoverMethods(
      mode === 'non-callable' ? true : mode === 'show-only' ? show : undefined,
      mode === 'non-callable' ? true : mode === 'hide-only' ? hide : undefined,
    );
    const { unmount } = render(<ImperativeToastRoot />);
    const toast = screen.getByText('Trip saved');
    const container = toast.closest('.radix-themes');
    expect(container).not.toHaveAttribute('popover');
    expect(toast).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Trip saved')).not.toBeInTheDocument();
    unmount();
    expect(show).not.toHaveBeenCalled();
    expect(hide).not.toHaveBeenCalled();
  },
);
test('uses the top layer on supported browsers and cleans up the same element', () => {
  const showPopover = vi.fn();
  const hidePopover = vi.fn();
  setPopoverMethods(showPopover, hidePopover);
  const { unmount } = render(<ImperativeToastRoot />);
  const container = screen.getByText('Trip saved').closest('.radix-themes');

  expect(container).toHaveAttribute('popover', 'manual');
  expect(showPopover).toHaveBeenCalledOnce();
  expect(showPopover.mock.contexts[0]).toBe(container);
  expect(hidePopover).not.toHaveBeenCalled();

  unmount();
  expect(hidePopover).toHaveBeenCalledOnce();
  expect(hidePopover.mock.contexts[0]).toBe(container);
});
