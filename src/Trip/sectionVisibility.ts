import { TripUserRole } from '../User/TripUserRole';
import type { TripSliceTrip } from './store/types';

export type SectionVisibility = {
  expenses: boolean;
  tasks: boolean;
  comments: boolean;
};

export function getSectionVisibility(trip: TripSliceTrip): SectionVisibility {
  const { currentUserRole, isCurrentUserTripMember } = trip;

  if (
    currentUserRole === TripUserRole.Owner ||
    currentUserRole === TripUserRole.Editor
  ) {
    return { expenses: true, tasks: true, comments: true };
  }

  if (isCurrentUserTripMember) {
    return {
      expenses: trip.viewerShowExpenses !== false,
      tasks: trip.viewerShowTasks !== false,
      comments: trip.viewerShowComments !== false,
    };
  }

  return {
    expenses: trip.publicShowExpenses !== false,
    tasks: trip.publicShowTasks !== false,
    comments: trip.publicShowComments !== false,
  };
}
