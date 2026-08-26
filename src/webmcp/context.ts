import { useBoundStore } from '../data/store';

/** Throws unless an authenticated user is present; returns their auth user id. */
export function requireAuthUser(): { id: string } {
  const { authUser } = useBoundStore.getState();
  if (!authUser) throw new Error('Not authenticated. Call auth-login first.');
  return authUser;
}

/**
 * Resolve the trip a tool should act on: the explicit `tripId` param, or the
 * currently open trip. Throws a descriptive, retry-able error otherwise.
 */
export function resolveTripId(tripId: unknown): string {
  if (typeof tripId === 'string' && tripId.length > 0) return tripId;
  const { currentTripId, trip } = useBoundStore.getState();
  if (currentTripId && trip[currentTripId]) return currentTripId;
  throw new Error(
    'No tripId provided and no trip is open. Provide a tripId or open the trip first.',
  );
}

/** Throws if the tripId is not currently loaded in the store. */
export function requireLoadedTrip(tripId: string): void {
  if (!useBoundStore.getState().trip[tripId]) {
    throw new Error(`Trip ${tripId} is not loaded in the current context.`);
  }
}
