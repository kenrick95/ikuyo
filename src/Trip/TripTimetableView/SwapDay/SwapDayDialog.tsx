import { Button, Dialog, Flex, Select, Spinner, Text } from '@radix-ui/themes';
import { useCallback, useState } from 'react';
import { toFormat } from '../../../common/dateTime/temporalFormatter';
import { dangerToken } from '../../../common/ui';
import { useBoundStore } from '../../../data/store';
import type { TripSliceActivity, TripSliceTrip } from '../../store/types';
import { dbSwapDayActivities } from './dbSwapDay';

export function SwapDayDialog({
  trip,
  activities,
  sourceDayIndex,
  days,
}: {
  trip: TripSliceTrip;
  activities: TripSliceActivity[];
  sourceDayIndex: number;
  days: Array<{ dayIndex: number; startMs: number }>;
}) {
  const popDialog = useBoundStore((state) => state.popDialog);
  const publishToast = useBoundStore((state) => state.publishToast);
  const resetToast = useBoundStore((state) => state.resetToast);

  const targetDays = days.filter((day) => day.dayIndex !== sourceDayIndex);
  const [selectedDayIndex, setSelectedDayIndex] = useState<string>(
    String(targetDays[0]?.dayIndex ?? ''),
  );
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const sourceDay = days.find((day) => day.dayIndex === sourceDayIndex);

  const dayLabel = useCallback(
    (dayIndex: number): string => {
      const day = days.find((d) => d.dayIndex === dayIndex);
      if (!day) return `Day ${dayIndex + 1}`;
      const dateTime = Temporal.Instant.fromEpochMilliseconds(
        day.startMs,
      ).toZonedDateTimeISO(trip.timeZone);
      return `Day ${dayIndex + 1} — ${toFormat('ccc, d LLL yyyy', dateTime)}`;
    },
    [days, trip.timeZone],
  );

  const handleSwap = useCallback(async () => {
    if (selectedDayIndex === '') return;
    const targetDay = days.find(
      (d) => d.dayIndex === Number.parseInt(selectedDayIndex, 10),
    );
    if (!targetDay || !sourceDay || targetDay.dayIndex === sourceDay.dayIndex) {
      return;
    }

    setIsSwapping(true);
    setError(undefined);
    try {
      const { movedCount, undo } = await dbSwapDayActivities({
        activities,
        sourceDayStartMs: sourceDay.startMs,
        targetDayStartMs: targetDay.startMs,
        timeZone: trip.timeZone,
      });

      const sourceLabel = dayLabel(sourceDay.dayIndex);
      const targetLabel = dayLabel(targetDay.dayIndex);
      popDialog();
      resetToast();
      publishToast({
        root: { duration: 15_000 },
        title: {
          children:
            movedCount > 0
              ? `Swapped activities from ${sourceLabel} to ${targetLabel}`
              : `No activities to swap on ${sourceLabel}`,
        },
        action:
          movedCount > 0
            ? {
                children: 'Undo',
                altText: `Undo the swap of ${sourceLabel} and ${targetLabel}`,
                onClick: async () => {
                  await undo();
                  resetToast();
                  publishToast({
                    root: {},
                    title: { children: `Undone swap of ${sourceLabel}` },
                    close: {},
                  });
                },
              }
            : undefined,
        close: {},
      });
    } catch (e) {
      console.error('Failed to swap day activities', e);
      setError(
        typeof e === 'string' && e
          ? e
          : 'Failed to swap activities. Please try again.',
      );
      setIsSwapping(false);
    }
  }, [
    activities,
    days,
    dayLabel,
    popDialog,
    publishToast,
    resetToast,
    selectedDayIndex,
    sourceDay,
    trip.timeZone,
  ]);

  return (
    <Dialog.Root open onOpenChange={popDialog}>
      <Dialog.Content
        maxWidth="480px"
        onEscapeKeyDown={popDialog}
        onInteractOutside={popDialog}
      >
        <Dialog.Title>Swap activities to another day</Dialog.Title>
        <Dialog.Description size="2">
          {sourceDay
            ? `Move all activities from ${dayLabel(sourceDay.dayIndex)} to another day. Activities already on the target day will be moved to ${dayLabel(sourceDay.dayIndex)} in exchange.`
            : 'Pick which day to swap.'}
        </Dialog.Description>

        <Flex direction="column" gap="3" mt="4">
          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Swap {sourceDay ? dayLabel(sourceDay.dayIndex) : 'this day'} with
            </Text>
            <Select.Root
              value={selectedDayIndex}
              onValueChange={(value) => {
                setSelectedDayIndex(value);
                setError(undefined);
              }}
              size="2"
              disabled={isSwapping}
            >
              <Select.Trigger />
              <Select.Content>
                {targetDays.map((day) => {
                  return (
                    <Select.Item
                      key={day.dayIndex}
                      value={String(day.dayIndex)}
                    >
                      {dayLabel(day.dayIndex)}
                    </Select.Item>
                  );
                })}
              </Select.Content>
            </Select.Root>
          </Flex>

          {error ? (
            <Text color={dangerToken} size="2">
              {error}
            </Text>
          ) : null}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Button
            variant="soft"
            color="gray"
            disabled={isSwapping}
            onClick={popDialog}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            disabled={selectedDayIndex === '' || isSwapping}
            onClick={handleSwap}
          >
            {isSwapping ? <Spinner size="1" /> : null}
            Swap day
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
