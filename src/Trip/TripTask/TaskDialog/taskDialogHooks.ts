import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { DialogMode, type DialogModeType } from '../../../Dialog/DialogRoute';
import { RouteTripTaskListTask } from '../../../Routes/routes';

export function useTaskDialogHooks(taskId: string) {
  const [, setLocation] = useLocation();
  const openTaskDialog = useCallback(
    (mode: DialogModeType) => {
      setLocation(RouteTripTaskListTask.asRouteTarget(taskId), {
        state: { mode: mode ?? DialogMode.View },
      });
    },
    [taskId, setLocation],
  );
  const openTaskViewDialog = useCallback(() => {
    openTaskDialog(DialogMode.View);
  }, [openTaskDialog]);
  const openTaskEditDialog = useCallback(() => {
    openTaskDialog(DialogMode.Edit);
  }, [openTaskDialog]);
  const openTaskDeleteDialog = useCallback(() => {
    openTaskDialog(DialogMode.Delete);
  }, [openTaskDialog]);

  return {
    openTaskViewDialog,
    openTaskEditDialog,
    openTaskDeleteDialog,
  };
}
