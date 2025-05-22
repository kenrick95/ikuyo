import { useDeepEqual } from '../data/hooks';
import { useBoundStore } from '../data/store';
import type { TripSliceAccommodation, TripSliceMacroplan } from './store';

export function useTrip(tripId: string | undefined) {
  const trip = useBoundStore(useDeepEqual((state) => state.getTrip(tripId)));
  return trip;
}
export function useCurrentTrip() {
  const trip = useBoundStore(useDeepEqual((state) => state.getCurrentTrip()));
  return trip;
}

export function useTripActivity(activityId: string) {
  const activity = useBoundStore(
    useDeepEqual((state) => state.getActivity(activityId)),
  );
  return activity;
}

export function useTripActivities(activityIds: string[]) {
  const tripUsers = useBoundStore(
    useDeepEqual((state) => state.getActivities(activityIds)),
  );
  return tripUsers;
}
export function useTripAccommodation(accommodationId: string) {
  const accommodation = useBoundStore(
    useDeepEqual((state) => state.getAccommodation(accommodationId)),
  );
  return accommodation;
}
export function useTripMacroplan(macroplanId: string) {
  const macroplan = useBoundStore(
    useDeepEqual((state) => state.getMacroplan(macroplanId)),
  );
  return macroplan;
}
export function useTripAllComments(tripId: string | undefined) {
  const comments = useBoundStore(
    useDeepEqual((state) => state.getAllComments(tripId)),
  );
  return comments;
}
export function useTripCommentGroup(commentGroupId: string | undefined) {
  const commentGroup = useBoundStore(
    useDeepEqual((state) => state.getCommentGroup(commentGroupId)),
  );
  return commentGroup;
}
export function useTripExpense(expenseId: string) {
  const expense = useBoundStore(
    useDeepEqual((state) => state.getExpense(expenseId)),
  );
  return expense;
}
export function useTripExpenses(expenseIds: string[]) {
  const tripUsers = useBoundStore(
    useDeepEqual((state) => state.getExpenses(expenseIds)),
  );
  return tripUsers;
}

export function useTripComments(ids: string[]) {
  const comments = useBoundStore(
    useDeepEqual((state) => state.getComments(ids)),
  );
  return comments;
}

export function useTripUserIds(userIds: string[]) {
  const tripUsers = useBoundStore(
    useDeepEqual((state) => state.getTripUsers(userIds)),
  );
  return tripUsers;
}
export function useTripAccommodations(
  accommodationIds: string[],
): TripSliceAccommodation[] {
  const accommodations = useBoundStore(
    useDeepEqual((state) => state.getAccommodations(accommodationIds)),
  );
  return accommodations;
}
export function useTripMacroplans(
  macroplanIds: string[],
): TripSliceMacroplan[] {
  const macroplans = useBoundStore(
    useDeepEqual((state) => state.getMacroplans(macroplanIds)),
  );
  return macroplans;
}
