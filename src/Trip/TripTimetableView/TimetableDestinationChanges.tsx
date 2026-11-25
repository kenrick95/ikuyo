import { Button, Flex, Popover, Text, Tooltip } from '@radix-ui/themes';
import type { DestinationChange } from '../destinations/destinationChanges';
import s from './Timetable.module.scss';

export function TimetableDestinationChanges({
  changes,
  day,
}: {
  changes: DestinationChange[];
  day: number;
}) {
  const first = changes[0];
  const more = changes.length - 1;
  if (!first) return null;

  return (
    <div
      className={s.destinationChanges}
      style={{ gridColumn: `d${day} / de${day}` }}
    >
      <Popover.Root>
        <Tooltip
          content={`${first.time} → ${first.name}`}
          maxWidth="min(22rem, 90vw)"
          className={s.destinationChangeDetail}
        >
          <Popover.Trigger>
            <Button
              type="button"
              variant="soft"
              size="1"
              className={s.destinationChangeTrigger}
            >
              <span>{first.time} →</span>
              <span className={s.destinationChangeName}>{first.name}</span>
              {more > 0 && <span>+{more}</span>}
            </Button>
          </Popover.Trigger>
        </Tooltip>
        <Popover.Content
          size="1"
          aria-label="Destination changes"
          className={s.destinationChangePopover}
          maxWidth="min(22rem, 90vw)"
          maxHeight="min(18rem, var(--radix-popper-available-height, 80vh))"
        >
          <Flex direction="column" gap="1">
            {changes.map((change) => (
              <Text
                key={change.id}
                size="2"
                className={s.destinationChangeDetail}
              >
                {change.time} → {change.name}
              </Text>
            ))}
          </Flex>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
