import { createDialogRoute } from '../Dialog/DialogRoute';
import { useBoundStore } from '../data/store';
import type { TripSliceAccommodation } from '../Trip/store';
import { AccommodationDialogContentDelete } from './AccommodationDialogContentDelete';
import { AccommodationDialogContentEdit } from './AccommodationDialogContentEdit';
import { AccommodationDialogContentView } from './AccommodationDialogContentView';

export const AccommodationDialog = createDialogRoute<TripSliceAccommodation>({
  DialogContentView: AccommodationDialogContentView,
  DialogContentEdit: AccommodationDialogContentEdit,
  DialogContentDelete: AccommodationDialogContentDelete,
  getData: (id) => useBoundStore((state) => state.getAccommodation(id)),
});
