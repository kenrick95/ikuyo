import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { type TripSliceMacroplan, useTrip } from '../Trip/store';
import { MacroplanDialogMode } from './MacroplanDialogMode';
import { MacroplanForm } from './MacroplanForm';
import { MacroplanFormMode } from './MacroplanFormMode';
import { formatToDateInput } from './time';

export function MacroplanDialogContentEdit({
  data: macroplan,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceMacroplan>) {
  const trip = useTrip(macroplan?.tripId);

  const tripStartStr =
    macroplan && trip
      ? formatToDateInput(
          DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
        )
      : '';
  const tripEndStr =
    macroplan && trip
      ? formatToDateInput(
          DateTime.fromMillis(trip.timestampEnd)
            .setZone(trip.timeZone)
            .minus({ minute: 1 }),
        )
      : '';

  const macroplanDateStartStr =
    macroplan && trip
      ? formatToDateInput(
          DateTime.fromMillis(macroplan.timestampStart).setZone(trip.timeZone),
        )
      : '';
  const macroplanDateEndStr =
    macroplan && trip
      ? formatToDateInput(
          DateTime.fromMillis(macroplan.timestampEnd)
            .setZone(trip.timeZone)
            .minus({ minute: 1 }),
        )
      : '';
  const backToViewMode = useCallback(() => {
    setMode(MacroplanDialogMode.View);
  }, [setMode]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Edit Day Plan" />
      <Dialog.Description size="2">
        Fill in the edited day plan details for this trip...
      </Dialog.Description>
      <Box height="16px" />
      {macroplan && trip ? (
        <MacroplanForm
          mode={MacroplanFormMode.Edit}
          tripId={macroplan.tripId}
          macroplanId={macroplan.id}
          tripTimeZone={trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          macroplanName={macroplan.name}
          macroplanDateStartStr={macroplanDateStartStr}
          macroplanDateEndStr={macroplanDateEndStr}
          macroplanNotes={macroplan.notes}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
