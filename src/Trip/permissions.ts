import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';

export function canModifyTripContent(trip: TripSliceTrip | undefined): boolean {
  return (
    trip?.archivedAt == null &&
    (trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor)
  );
}
