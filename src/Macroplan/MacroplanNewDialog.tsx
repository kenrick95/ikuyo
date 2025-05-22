import { Dialog, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { TripSliceTrip } from '../Trip/store/types';
import { MacroplanForm } from './MacroplanForm';
import { MacroplanFormMode } from './MacroplanFormMode';
import { formatToDateInput } from './time';

export function MacroplanNewDialog({ trip }: { trip: TripSliceTrip }) {
  const popDialog = useBoundStore((state) => state.popDialog);
  const tripStartStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampStart).setZone(trip.timeZone),
  );
  const tripEndStr = formatToDateInput(
    DateTime.fromMillis(trip.timestampEnd)
      .setZone(trip.timeZone)
      .minus({ minute: 1 }),
  );

  const [macroplanCheckInStr, macroplanCheckOutStr] = useMemo(() => {
    return [
      formatToDateInput(
        DateTime.fromMillis(trip.timestampStart)
          .setZone(trip.timeZone)
          // Usually check-in is 3pm of the first day
          .plus({ hour: 15 }),
      ),
      formatToDateInput(
        DateTime.fromMillis(trip.timestampEnd)
          .setZone(trip.timeZone)
          .minus({
            day: 1,
          })
          // Usually check-out is 11am of the last day
          .plus({ hour: 11 }),
      ),
    ];
  }, [trip]);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>New Day Plan</Dialog.Title>
        <Dialog.Description size="2">
          <Text as="p">
            Day plan is a high-level plan to organize your trip into multiple
            segments.
          </Text>
          <Text size="1" as="p">
            For example, you can divide a trip by location:
          </Text>
          <ul className="rt-Text rt-r-size-1">
            <li>Day 1-3: Tokyo</li>
            <li>Day 4-6: Kyoto</li>
            <li>Day 7-9: Osaka</li>
          </ul>
        </Dialog.Description>
        <MacroplanForm
          mode={MacroplanFormMode.New}
          tripId={trip.id}
          tripTimeZone={trip.timeZone}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          macroplanName=""
          macroplanDateStartStr={macroplanCheckInStr}
          macroplanDateEndStr={macroplanCheckOutStr}
          macroplanNotes=""
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
