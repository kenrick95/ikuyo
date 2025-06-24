import { useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripListViewAccommodation,
  RouteTripTimetableViewAccommodation,
} from '../../Routes/routes';
import { TripViewMode, type TripViewModeType } from '../../Trip/TripViewMode';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';

export function useAccommodationDialogHooks(
  tripViewMode: TripViewModeType,
  accommodationId: string,
) {
  const [, setLocation] = useLocation();
  const openAccommodationDialog = useCallback(
    (mode: AccommodationDialogModeType) => {
      if (tripViewMode === TripViewMode.List) {
        setLocation(
          RouteTripListViewAccommodation.asRouteTarget(accommodationId),
          {
            state: { mode: mode ?? AccommodationDialogMode.View },
          },
        );
      } else if (tripViewMode === TripViewMode.Timetable) {
        setLocation(
          RouteTripTimetableViewAccommodation.asRouteTarget(accommodationId),
          {
            state: { mode: mode ?? AccommodationDialogMode.View },
          },
        );
      }
    },
    [accommodationId, setLocation, tripViewMode],
  );
  const openAccommodationViewDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.View);
  }, [openAccommodationDialog]);
  const openAccommodationEditDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.Edit);
  }, [openAccommodationDialog]);
  const openAccommodationDeleteDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.Delete);
  }, [openAccommodationDialog]);

  return {
    openAccommodationViewDialog,
    openAccommodationEditDialog,
    openAccommodationDeleteDialog,
  };
}
