import { createDialogRoute } from '../../Dialog/DialogRoute';
import { useDeepBoundStore } from '../../data/store';
import type { TripSliceActivity } from '../../Trip/store/types';
import { ActivityDialogContentDelete } from './ActivityDialogContentDelete';
import { ActivityDialogContentEdit } from './ActivityDialogContentEdit';
import { ActivityDialogContentView } from './ActivityDialogContentView';

export const ActivityDialog = createDialogRoute<TripSliceActivity>({
  DialogContentView: ActivityDialogContentView,
  DialogContentEdit: ActivityDialogContentEdit,
  DialogContentDelete: ActivityDialogContentDelete,
  getData: (id) => useDeepBoundStore((state) => state.getActivity(id)),
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
