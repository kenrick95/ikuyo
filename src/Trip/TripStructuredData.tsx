import { useEffect } from 'react';
import { apiRequest } from '../data/apiClient';
import { useDeepBoundStore } from '../data/store';
import {
  pageStructuredData,
  structuredDataScriptId,
} from '../Nav/structuredData';
import type { TripSliceTrip } from './store/types';

const scriptId = structuredDataScriptId;

/** Keep the server-rendered metadata current during client-side navigation. */
export function TripStructuredData({
  trip,
}: {
  trip: TripSliceTrip | undefined;
}) {
  const activities = useDeepBoundStore((state) =>
    state.getActivities(trip?.activityIds ?? []),
  );
  const accommodations = useDeepBoundStore((state) =>
    state.getAccommodations(trip?.accommodationIds ?? []),
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Child edits invalidate the server snapshot even though the effect does not serialize them locally.
  useEffect(() => {
    document.getElementById(scriptId)?.remove();
    if (!trip) return;

    const controller = new AbortController();
    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    void apiRequest<Record<string, unknown>[]>(
      `/api/trips/${encodeURIComponent(trip.id)}/export/jsonld`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        const page = pageStructuredData(
          window.location.origin,
          `/trip/${encodeURIComponent(trip.id)}`,
          trip.title,
          '',
          `urn:ikuyo:trip:${encodeURIComponent(trip.id)}`,
        );
        script.textContent = JSON.stringify([...page, ...data]);
        document.head.appendChild(script);
      })
      .catch(() => {
        // Metadata is optional. Never retain another trip's data on failure.
      });
    return () => {
      controller.abort();
      script.remove();
    };
    // Child edits and collaboration refreshes also invalidate the snapshot.
  }, [trip, activities, accommodations]);

  return null;
}
