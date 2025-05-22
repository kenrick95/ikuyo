import { createDialogRoute } from '../Dialog/DialogRoute';
import { useDeepBoundStore } from '../data/store';
import type { TripSliceAccommodation } from '../Trip/store/types';
import { AccommodationDialogContentDelete } from './AccommodationDialogContentDelete';
import { AccommodationDialogContentEdit } from './AccommodationDialogContentEdit';
import { AccommodationDialogContentView } from './AccommodationDialogContentView';

export const AccommodationDialog = createDialogRoute<TripSliceAccommodation>({
  DialogContentView: AccommodationDialogContentView,
  DialogContentEdit: AccommodationDialogContentEdit,
  DialogContentDelete: AccommodationDialogContentDelete,
  getData: (id) => useDeepBoundStore((state) => state.getAccommodation(id)),
});
