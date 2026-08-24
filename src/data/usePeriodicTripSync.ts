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

/**
 * Polls the Laravel sync cursor while a trip page is open.
 * Consumers decide how to merge changes into their normalized Zustand state.
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

    const sync = async () => {
      try {
        const response = await get<SyncResponse>(
          `/api/sync?cursor=${cursor}&tripId=${encodeURIComponent(tripId)}`,
        );
        if (disposed) return;
        cursor = Math.max(cursor, response.nextCursor);
        if (response.changes.length > 0) onChangesRef.current(response.changes);
      } catch {
        // A failed background refresh must not disrupt the currently visible trip.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const timer = window.setInterval(() => void sync(), intervalMs);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [tripId, intervalMs]);
}
