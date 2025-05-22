import { useDeepBoundStore } from '../data/store';
import type { TripSliceAccommodation, TripSliceMacroplan } from './store/types';

export function useTrip(tripId: string | undefined) {
  const trip = useDeepBoundStore((state) => state.getTrip(tripId));
  return trip;
}
export function useCurrentTrip() {
  const trip = useDeepBoundStore((state) => state.getCurrentTrip());
  return trip;
}

export function useTripActivity(activityId: string) {
  const activity = useDeepBoundStore((state) => state.getActivity(activityId));
  return activity;
}

export function useTripActivities(activityIds: string[]) {
  const tripUsers = useDeepBoundStore((state) =>
    state.getActivities(activityIds),
  );
  return tripUsers;
}
export function useTripAccommodation(accommodationId: string) {
  const accommodation = useDeepBoundStore((state) =>
    state.getAccommodation(accommodationId),
  );
  return accommodation;
}
export function useTripMacroplan(macroplanId: string) {
  const macroplan = useDeepBoundStore((state) =>
    state.getMacroplan(macroplanId),
  );
  return macroplan;
}
export function useTripAllComments(tripId: string | undefined) {
  const comments = useDeepBoundStore((state) => state.getAllComments(tripId));
  return comments;
}
export function useTripCommentGroup(commentGroupId: string | undefined) {
  const commentGroup = useDeepBoundStore((state) =>
    state.getCommentGroup(commentGroupId),
  );
  return commentGroup;
}
export function useTripExpense(expenseId: string) {
  const expense = useDeepBoundStore((state) => state.getExpense(expenseId));
  return expense;
}
export function useTripExpenses(expenseIds: string[]) {
  const tripUsers = useDeepBoundStore((state) => state.getExpenses(expenseIds));
  return tripUsers;
}

export function useTripComments(ids: string[]) {
  const comments = useDeepBoundStore((state) => state.getComments(ids));
  return comments;
}

export function useTripUserIds(userIds: string[]) {
  const tripUsers = useDeepBoundStore((state) => state.getTripUsers(userIds));
  return tripUsers;
}
export function useTripAccommodations(
  accommodationIds: string[],
): TripSliceAccommodation[] {
  const accommodations = useDeepBoundStore((state) =>
    state.getAccommodations(accommodationIds),
  );
  return accommodations;
}
export function useTripMacroplans(
  macroplanIds: string[],
): TripSliceMacroplan[] {
  const macroplans = useDeepBoundStore((state) =>
    state.getMacroplans(macroplanIds),
  );
  return macroplans;
}
