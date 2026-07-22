import { Dialog, Text } from '@radix-ui/themes';
import { useCallback, useMemo } from 'react';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { MacroplanForm } from './MacroplanForm';
import { MacroplanFormMode } from './MacroplanFormMode';

export function MacroplanNewDialog({
  trip,
  prefillData,
}: {
  trip: TripSliceTrip;
  prefillData?: {
    dayOfTrip: number;
  };
}) {
  const popDialog = useBoundStore((state) => state.popDialog);
  const askToConfirmPopDialog = useBoundStore(
    (state) => state.askToConfirmPopDialog,
  );
  const handleFormCancel = useCallback(() => {
    askToConfirmPopDialog();
  }, [askToConfirmPopDialog]);

  const tripStartDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate();
  const tripEndDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampEnd,
  )
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate()
    .subtract({ days: 1 });

  const [
    macroplanStartDate,
    macroplanEndDate,
    macroplanStartTimeZone,
    macroplanEndTimeZone,
  ] = useMemo(() => {
    if (prefillData) {
      // Calculate the start of the selected day
      const tripStart = Temporal.Instant.fromEpochMilliseconds(
        trip.timestampStart,
      ).toZonedDateTimeISO(trip.timeZone);
      const selectedDay = tripStart
        .add({ days: prefillData.dayOfTrip - 1 })
        .startOfDay();

      // Set start date to the selected day
      const startDate = selectedDay;
      // Set end date to the same day (single day plan by default)
      const endDate = selectedDay;

      return [
        startDate.toPlainDate(),
        endDate.toPlainDate(),
        trip.timeZone,
        trip.timeZone,
      ];
    }

    // Default behavior when no prefillData
    return [
      Temporal.Instant.fromEpochMilliseconds(trip.timestampStart)
        .toZonedDateTimeISO(trip.timeZone)
        .toPlainDate(),
      Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
        .toZonedDateTimeISO(trip.timeZone)
        .subtract({
          days: 1,
        })
        .toPlainDate(),
      trip.timeZone,
      trip.timeZone,
    ];
  }, [trip, prefillData]);

  return (
    <Dialog.Root open>
      <Dialog.Content
        maxWidth={CommonLargeDialogMaxWidth}
        onEscapeKeyDown={handleFormCancel}
      >
        <Dialog.Title>New Day Plan</Dialog.Title>
        <Dialog.Description size="2">
          <Text as="p">
            Day plan is a high-level plan to organize your trip into multiple
            segments.
          </Text>
          <Text size="1" as="p">
            For example, you can divide a trip by location:
          </Text>
          <Text size="1" as="p">
            Day 1-3: Tokyo
          </Text>
          <Text size="1" as="p">
            Day 4-6: Kyoto
          </Text>
          <Text size="1" as="p">
            Day 7-9: Osaka
          </Text>
        </Dialog.Description>
        <MacroplanForm
          mode={MacroplanFormMode.New}
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartDate={tripStartDateTime}
          tripEndDate={tripEndDateTime}
          macroplanName=""
          macroplanStartDate={macroplanStartDate}
          macroplanEndDate={macroplanEndDate}
          macroplanStartTimeZone={macroplanStartTimeZone}
          macroplanEndTimeZone={macroplanEndTimeZone}
          macroplanNotes=""
          onFormCancel={handleFormCancel}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
