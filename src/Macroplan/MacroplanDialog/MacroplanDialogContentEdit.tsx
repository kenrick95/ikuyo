import { Box, Dialog, Spinner } from '@radix-ui/themes';
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
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampStart)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
      : undefined;
  const tripEndDateTime =
    macroplan && trip
      ? Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
          .subtract({ days: 1 })
      : undefined;

  const macroplanStartDate =
    macroplan && trip && macroplan.timestampStart != null
      ? Temporal.Instant.fromEpochMilliseconds(macroplan.timestampStart)
          .toZonedDateTimeISO(macroplan.timeZoneStart ?? trip.timeZone)
          .toPlainDate()
      : undefined;
  const macroplanEndDate =
    macroplan && trip && macroplan.timestampEnd != null
      ? Temporal.Instant.fromEpochMilliseconds(macroplan.timestampEnd)
          .toZonedDateTimeISO(macroplan.timeZoneEnd ?? trip.timeZone)
          .toPlainDate()
          .subtract({ days: 1 })
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
          tripStartDate={tripStartDateTime}
          tripEndDate={tripEndDateTime}
          macroplanName={macroplan.name}
          macroplanStartDate={macroplanStartDate}
          macroplanEndDate={macroplanEndDate}
          macroplanStartTimeZone={macroplan.timeZoneStart || trip.timeZone}
          macroplanEndTimeZone={macroplan.timeZoneEnd || trip.timeZone}
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
