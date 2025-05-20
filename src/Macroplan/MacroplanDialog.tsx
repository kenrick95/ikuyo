import { createDialogRoute } from '../Dialog/DialogRoute';
import { useBoundStore } from '../data/store';
import type { TripSliceMacroplan } from '../Trip/store';
import { MacroplanDialogContentDelete } from './MacroplanDialogContentDelete';
import { MacroplanDialogContentEdit } from './MacroplanDialogContentEdit';
import { MacroplanDialogContentView } from './MacroplanDialogContentView';

export const MacroplanDialog = createDialogRoute<TripSliceMacroplan>({
  DialogContentView: MacroplanDialogContentView,
  DialogContentEdit: MacroplanDialogContentEdit,
  DialogContentDelete: MacroplanDialogContentDelete,
  getData: (id) => useBoundStore((state) => state.getMacroplan(id)),
});
