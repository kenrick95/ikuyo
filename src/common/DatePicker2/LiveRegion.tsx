import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  priority?: 'polite' | 'assertive';
  clearDelay?: number;
}

/**
 * A11Y: Live region component for announcing changes to screen readers
 * Used for announcing date changes, month navigation, etc.
 */
export function LiveRegion({
  message,
  priority = 'polite',
  clearDelay = 1000,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!message) return;

    // Set the message
    if (regionRef.current) {
      regionRef.current.textContent = message;
    }

    // Clear the message after delay to prevent repetitive announcements
    const timeout = setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = '';
      }
    }, clearDelay);

    return () => clearTimeout(timeout);
  }, [message, clearDelay]);

  return (
    <div
      ref={regionRef}
      aria-live={priority}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    />
  );
}
