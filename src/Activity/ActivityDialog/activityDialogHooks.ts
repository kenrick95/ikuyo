import { useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripListViewActivity,
  RouteTripTimetableViewActivity,
} from '../../Routes/routes';
import { TripViewMode, type TripViewModeType } from '../../Trip/TripViewMode';
import {
  ActivityDialogMode,
  type ActivityDialogModeType,
} from './ActivityDialogMode';

export function useActivityDialogHooks(
  tripViewMode: TripViewModeType,
  activityId: string,
) {
  const [, setLocation] = useLocation();
  const openActivityDialog = useCallback(
    (mode: ActivityDialogModeType) => {
      if (tripViewMode === TripViewMode.List) {
        setLocation(RouteTripListViewActivity.asRouteTarget(activityId), {
          state: { mode: mode ?? ActivityDialogMode.View },
        });
      } else if (tripViewMode === TripViewMode.Timetable) {
        setLocation(RouteTripTimetableViewActivity.asRouteTarget(activityId), {
          state: { mode: mode ?? ActivityDialogMode.View },
        });
      }
    },
    [activityId, setLocation, tripViewMode],
  );
  const openActivityViewDialog = useCallback(() => {
    openActivityDialog(ActivityDialogMode.View);
  }, [openActivityDialog]);
  const openActivityEditDialog = useCallback(() => {
    openActivityDialog(ActivityDialogMode.Edit);
  }, [openActivityDialog]);
  const openActivityDeleteDialog = useCallback(() => {
    openActivityDialog(ActivityDialogMode.Delete);
  }, [openActivityDialog]);

  return {
    openActivityViewDialog,
    openActivityEditDialog,
    openActivityDeleteDialog,
  };
}
