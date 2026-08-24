import { useEffect, useRef } from 'react';
import { get } from './apiClient';

export type SyncChange = {
  entity: string;
  id: string;
  updatedAt: number;
  op: 'upsert' | 'delete';
  data?: Record<string, unknown>;
};

type SyncResponse = {
  changes: SyncChange[];
  nextCursor: number;
};

/** Don't fire an event-driven refresh more often than this (ms). */
const EVENT_REFRESH_DEBOUNCE_MS = 1500;

/**
 * Polls the Laravel sync cursor while a trip page is open.
 * Consumers decide how to merge changes into their normalized Zustand state.
 *
 * Optimized to avoid redundant requests:
 * - An in-flight guard coalesces overlapping polls (no concurrent requests).
 * - `focus` and `visibilitychange` often fire together when a tab is activated;
 *   the event-driven refresh is debounced so they become a single request.
 * - The interval only polls while the document is actually visible; switching to
 *   a hidden tab stops polling, and returning triggers one fresh sync.
 */
export function usePeriodicTripSync(
  tripId: string | undefined,
  onChanges: (changes: SyncChange[]) => void,
  intervalMs = 30_000,
): void {
  // Keep the latest callback in a ref so a changing identity (common with inline
  // closures over props) does not tear down and restart the poll on every render.
  const onChangesRef = useRef(onChanges);
  onChangesRef.current = onChanges;

  useEffect(() => {
    if (!tripId) return;
    let disposed = false;
    // Sync cursors are durable sync_events IDs, not wall-clock timestamps.
    let cursor = 0;
    // Coalesce overlapping polls: skip a requested sync while one is running.
    let syncing = false;
    // Coalesce the focus/visibility event burst on tab re-activation.
    let lastEventRefreshAt = 0;

    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const response = await get<SyncResponse>(
          `/api/sync?cursor=${cursor}&tripId=${encodeURIComponent(tripId)}`,
        );
        if (disposed) return;
        cursor = Math.max(cursor, response.nextCursor);
        if (response.changes.length > 0) onChangesRef.current(response.changes);
      } catch {
        // A failed background refresh must not disrupt the currently visible trip.
      } finally {
        syncing = false;
      }
    };

    // Event-driven refresh (focus / becoming visible). Both events fire together
    // when a tab is activated, so debounce them into a single request.
    const refreshOnActive = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastEventRefreshAt < EVENT_REFRESH_DEBOUNCE_MS) return;
      lastEventRefreshAt = now;
      void sync();
    };

    // Interval only polls while the tab is visible, so background tabs are idle.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sync();
    }, intervalMs);

    document.addEventListener('visibilitychange', refreshOnActive);
    window.addEventListener('focus', refreshOnActive);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshOnActive);
      window.removeEventListener('focus', refreshOnActive);
    };
  }, [tripId, intervalMs]);
}
