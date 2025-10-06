import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../Dialog/DialogRoute';
import { useTrip } from '../../Trip/store/hooks';
import type { TripSliceMacroplan } from '../../Trip/store/types';
import { MacroplanForm } from '../MacroplanForm';
import { MacroplanFormMode } from '../MacroplanFormMode';
import { MacroplanDialogMode } from './MacroplanDialogMode';

export function MacroplanDialogContentEdit({
  data: macroplan,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceMacroplan>) {
  const { trip } = useTrip(macroplan?.tripId);

  const tripStartDateTime =
    macroplan && trip
      ? DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone)
      : undefined;
  const tripEndDateTime =
    macroplan && trip
      ? DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({ minute: 1 })
      : undefined;

  const macroplanDateStartDateTime =
    macroplan && trip
      ? DateTime.fromMillis(macroplan.timestampStart).setZone(
          macroplan.timeZoneStart ?? trip.timeZone,
        )
      : undefined;
  const macroplanDateEndDateTime =
    macroplan && trip
      ? DateTime.fromMillis(macroplan.timestampEnd)
          .setZone(macroplan.timeZoneEnd ?? trip.timeZone)
          .minus({ minute: 1 })
      : undefined;
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
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          macroplanName={macroplan.name}
          macroplanDateStartDateTime={macroplanDateStartDateTime}
          macroplanDateEndDateTime={macroplanDateEndDateTime}
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
