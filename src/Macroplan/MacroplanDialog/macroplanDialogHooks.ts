import { useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripListViewMacroplan,
  RouteTripTimetableViewMacroplan,
} from '../../Routes/routes';
import { TripViewMode, type TripViewModeType } from '../../Trip/TripViewMode';
import {
  MacroplanDialogMode,
  type MacroplanDialogModeType,
} from './MacroplanDialogMode';

export function useMacroplanDialogHooks(
  tripViewMode: TripViewModeType,
  macroplanId: string,
) {
  const [, setLocation] = useLocation();
  const openMacroplanDialog = useCallback(
    (mode: MacroplanDialogModeType) => {
      if (tripViewMode === TripViewMode.List) {
        setLocation(RouteTripListViewMacroplan.asRouteTarget(macroplanId), {
          state: { mode: mode ?? MacroplanDialogMode.View },
        });
      } else if (tripViewMode === TripViewMode.Timetable) {
        setLocation(
          RouteTripTimetableViewMacroplan.asRouteTarget(macroplanId),
          {
            state: { mode: mode ?? MacroplanDialogMode.View },
          },
        );
      }
    },
    [macroplanId, setLocation, tripViewMode],
  );
  const openMacroplanViewDialog = useCallback(() => {
    openMacroplanDialog(MacroplanDialogMode.View);
  }, [openMacroplanDialog]);
  const openMacroplanEditDialog = useCallback(() => {
    openMacroplanDialog(MacroplanDialogMode.Edit);
  }, [openMacroplanDialog]);
  const openMacroplanDeleteDialog = useCallback(() => {
    openMacroplanDialog(MacroplanDialogMode.Delete);
  }, [openMacroplanDialog]);

  return {
    openMacroplanViewDialog,
    openMacroplanEditDialog,
    openMacroplanDeleteDialog,
  };
}
