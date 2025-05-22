import { useDeepEqual } from '../../data/hooks';
import { useBoundStore } from '../../data/store';
import type { TripGroupType } from '../TripGroup';
import type { TripsSliceTrip } from './store';

export function useTripsGrouped(
  currentUserId: string | undefined,
  now: number,
): Record<TripGroupType, TripsSliceTrip[]> {
  const tripGroups = useBoundStore(
    useDeepEqual((state) => {
      return state.getTripsGrouped(currentUserId, now);
    }),
  );
  return tripGroups;
}
