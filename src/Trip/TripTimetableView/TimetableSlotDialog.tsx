import { PlusIcon } from '@radix-ui/react-icons';
import {
  Button,
  Dialog,
  Flex,
  IconButton,
  Select,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { type SubmitEvent, useId, useMemo, useRef, useState } from 'react';
import type { TripSliceTrip } from '../store/types';
import { gridSlot, pad2 } from './time';
import {
  slotActions,
  type TimetableAction,
  type TimetableSlot,
  useTimetableSlotActions,
} from './useTimetableSlotActions';

export function TimetableSlotDialog({
  trip,
  days,
  initialDay,
}: {
  trip: TripSliceTrip;
  days: Temporal.ZonedDateTime[];
  initialDay: number;
}) {
  const [open, setOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(initialDay);
  const [time, setTime] = useState('');
  const prefix = useId();
  const openSlot = useTimetableSlotActions(trip);
  const pending = useRef<{
    action: TimetableAction;
    slot: TimetableSlot;
  } | null>(null);
  const selectedDayIndex = days[dayIndex] ? dayIndex : 0;
  const day = days[selectedDayIndex];
  const slots = useMemo(() => {
    if (!open || !day) return [];
    return Array.from({ length: 48 }, (_, index) => {
      const hour = pad2(Math.floor(index / 2));
      const minute = index % 2 ? '30' : '00';
      const base = hour + minute;
      const repeated = gridSlot(day, `${base}-repeat`);
      return [base, `${base}-repeat`].flatMap((key) => {
        const instant = key === base ? gridSlot(day, base) : repeated;
        if (instant === undefined) return [];
        const offset =
          repeated === undefined
            ? ''
            : ` (UTC${Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(day.timeZoneId).offset})`;
        return [{ key, instant, label: `${hour}:${minute}${offset}` }];
      });
    })
      .flat()
      .sort((a, b) => a.instant - b.instant);
  }, [day, open]);
  const selected = slots.find((slot) => slot.key === time) ?? slots[0];

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!day || !selected) return;
    const selectedAction = new FormData(event.currentTarget).get('action');
    const action = slotActions.find((item) => item.id === selectedAction);
    if (!action) return;
    pending.current = {
      action: action.id,
      slot: {
        dayOfTrip: selectedDayIndex + 1,
        timeStart: selected.key,
        instant: selected.instant,
        date: day.toPlainDate().toString(),
      },
    };
    setOpen(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Tooltip content="Add at time">
        <Dialog.Trigger>
          <IconButton
            aria-label="Add at time"
            variant="ghost"
            color="gray"
            size="2"
          >
            <PlusIcon />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content
        aria-describedby={undefined}
        maxWidth="26rem"
        onCloseAutoFocus={(event) => {
          const next = pending.current;
          if (!next) return;
          event.preventDefault();
          pending.current = null;
          openSlot(next.action, next.slot);
        }}
      >
        <Dialog.Title>Add at time</Dialog.Title>
        <Flex asChild direction="column" gap="3">
          <form onSubmit={submit}>
            <Flex direction="column" gap="1">
              <Text as="label" htmlFor={`${prefix}-day`} size="2">
                Date
              </Text>
              <Select.Root
                value={String(selectedDayIndex)}
                onValueChange={(value) => setDayIndex(Number(value))}
              >
                <Select.Trigger id={`${prefix}-day`} />
                <Select.Content position="popper">
                  {days.map((item, index) => (
                    <Select.Item
                      key={item.epochMilliseconds}
                      value={String(index)}
                    >
                      {item.toPlainDate().toLocaleString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex direction="column" gap="1">
              <Text as="label" htmlFor={`${prefix}-time`} size="2">
                Time ({day?.timeZoneId})
              </Text>
              <Select.Root value={selected?.key ?? ''} onValueChange={setTime}>
                <Select.Trigger id={`${prefix}-time`} />
                <Select.Content position="popper">
                  {slots.map((item) => (
                    <Select.Item key={item.key} value={item.key}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex direction="column" gap="1">
              <Text as="label" htmlFor={`${prefix}-action`} size="2">
                Item
              </Text>
              <Select.Root name="action" defaultValue="activity">
                <Select.Trigger id={`${prefix}-action`} />
                <Select.Content position="popper">
                  {slotActions.map((item) => (
                    <Select.Item key={item.id} value={item.id}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex justify="end" gap="2">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={!selected}>
                Continue
              </Button>
            </Flex>
          </form>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
