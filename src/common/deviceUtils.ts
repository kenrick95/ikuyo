import { useState } from 'react';

/**
 * Detects if the user is on a touch device without pointer/mouse support
 * This helps determine when to disable drag and drop functionality
 */
export function isTouchOnlyDevice(): boolean {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return false;
  }

  const maxTouchPoints = Number.isFinite(navigator.maxTouchPoints)
    ? // https://stackoverflow.com/a/67909182 Windows 10+ 'lies' about max touch point, it returns 256
      navigator.maxTouchPoints === 256
      ? 0
      : navigator.maxTouchPoints
    : 0;

  // Check for touch support
  const hasTouch = 'ontouchstart' in window || maxTouchPoints > 0;

  // Check for pointer device support (mouse, trackpad, etc.)
  // If we have pointer events, check if any pointer device is available
  if ('PointerEvent' in window && maxTouchPoints) {
    // If maxTouchPoints > 0 but we don't have any non-touch pointers, it's touch-only
    // This is a heuristic - not perfect but covers most cases
    return hasTouch && maxTouchPoints > 0;
  }

  // Fallback: Check media queries for coarse pointer (typically touch)
  // and no hover capability (typically indicates touch-only)
  if (window.matchMedia) {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const hasNoHover = window.matchMedia('(hover: none)').matches;
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

    // Touch-only if we have coarse pointer, no hover, and no fine pointer
    return hasTouch && hasCoarsePointer && hasNoHover && !hasFinePointer;
  }

  // Conservative fallback - if we can't determine, assume it's not touch-only
  // to avoid breaking functionality
  return false;
}

export function useIsTouchOnlyDevice(): boolean {
  const [isTouchOnly] = useState(isTouchOnlyDevice());
  return isTouchOnly;
}
export function useShouldDisableDragAndDrop(): boolean {
  const [isDisabled] = useState(isTouchOnlyDevice());
  return isDisabled;
}
