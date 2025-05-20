import { createDialogRoute } from '../Dialog/DialogRoute';
import { useBoundStore } from '../data/store';
import type { TripSliceActivity } from '../Trip/store';
import { ActivityDialogContentDelete } from './ActivityDialogContentDelete';
import { ActivityDialogContentEdit } from './ActivityDialogContentEdit';
import { ActivityDialogContentView } from './ActivityDialogContentView';

export const ActivityDialog = createDialogRoute<TripSliceActivity>({
  DialogContentView: ActivityDialogContentView,
  DialogContentEdit: ActivityDialogContentEdit,
  DialogContentDelete: ActivityDialogContentDelete,
  getData: (id) => useBoundStore((state) => state.getActivity(id)),
});
