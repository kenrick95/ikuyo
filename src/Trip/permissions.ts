import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';

export function canModifyTripContent(trip: TripSliceTrip | undefined): boolean {
  return (
    trip?.archivedAt == null &&
    (trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor)
  );
}

export function isTripOwner(trip: TripSliceTrip | undefined): boolean {
  return trip?.currentUserRole === TripUserRole.Owner;
}
