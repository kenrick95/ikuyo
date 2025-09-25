import { Dialog, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
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
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd)
    .setZone(trip.timeZone)
    .minus({ minute: 1 });

  const [macroplanCheckInDateTime, macroplanCheckOutDateTime] = useMemo(() => {
    if (prefillData) {
      // Calculate the start of the selected day
      const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
        trip.timeZone,
      );
      const selectedDay = tripStart
        .plus({ days: prefillData.dayOfTrip - 1 })
        .startOf('day');

      // Set start date to the selected day
      const startDate = selectedDay;
      // Set end date to the same day (single day plan by default)
      const endDate = selectedDay;

      return [startDate, endDate];
    }

    // Default behavior when no prefillData
    return [
      DateTime.fromMillis(trip.timestampStart)
        .setZone(trip.timeZone)
        // Usually check-in is 3pm of the first day
        .plus({ hour: 15 }),
      DateTime.fromMillis(trip.timestampEnd)
        .setZone(trip.timeZone)
        .minus({
          day: 1,
        })
        // Usually check-out is 11am of the last day
        .plus({ hour: 11 }),
    ];
  }, [trip, prefillData]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
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
          tripStartDateTime={tripStartDateTime}
          tripEndDateTime={tripEndDateTime}
          macroplanName=""
          macroplanDateStartDateTime={macroplanCheckInDateTime}
          macroplanDateEndDateTime={macroplanCheckOutDateTime}
          macroplanNotes=""
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
