import { useBoundStore } from '../data/store';

/**
 * Throws unless both the auth session and application user record are ready.
 * Return the application user id: it is the id required by the InstantDB
 * fallback, whereas `authUser.id` is the separate auth-namespace id.
 */
export function requireAuthUser(): { id: string } {
  const { authUser, currentUser } = useBoundStore.getState();
  if (!authUser || !currentUser) {
    throw new Error('Not authenticated. Call auth-login first.');
  }
  return currentUser;
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
