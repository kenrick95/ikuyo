import { createDialogRoute } from '../../Dialog/DialogRoute';
import { useDeepBoundStore } from '../../data/store';
import type { TripSliceMacroplan } from '../../Trip/store/types';
import { MacroplanDialogContentDelete } from './MacroplanDialogContentDelete';
import { MacroplanDialogContentEdit } from './MacroplanDialogContentEdit';
import { MacroplanDialogContentView } from './MacroplanDialogContentView';

export const MacroplanDialog = createDialogRoute<TripSliceMacroplan>({
  DialogContentView: MacroplanDialogContentView,
  DialogContentEdit: MacroplanDialogContentEdit,
  DialogContentDelete: MacroplanDialogContentDelete,
  getData: (id) => useDeepBoundStore((state) => state.getMacroplan(id)),
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
