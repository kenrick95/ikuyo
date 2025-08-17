import { useDeepBoundStore } from '../../../data/store';
import { createDialogRoute } from '../../../Dialog/DialogRoute';
import type { TripSliceTask } from '../../store/types';
import { TaskDialogContentDelete } from './TaskDialogContentDelete';
import { TaskDialogContentEdit } from './TaskDialogContentEdit';
import { TaskDialogContentView } from './TaskDialogContentView';

export const TaskDialog = createDialogRoute<TripSliceTask>({
  DialogContentView: TaskDialogContentView,
  DialogContentEdit: TaskDialogContentEdit,
  DialogContentDelete: TaskDialogContentDelete,
  getData: (id) => useDeepBoundStore((state) => state.getTask(id)),
  getDataMeta: () => {
    const { loading, error } = useDeepBoundStore((state) =>
      state.getCurrentTripMeta(),
    );
    return {
      loading: !!loading,
      error: error,
    };
  },
});
