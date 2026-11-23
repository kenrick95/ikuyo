import { Flex, Select, Text } from '@radix-ui/themes';
import { useId, useState } from 'react';
import {
  type DestinationTrip,
  destinationAt,
  destinationChoices,
} from './destinations';

export function useDestinationDefaults(
  trip: DestinationTrip | undefined,
  value: Temporal.PlainDateTime | undefined,
  place?: string,
  instant?: number,
) {
  const [selectedId, setSelectedId] = useState('');
  const choices = trip?.destinations?.length
    ? instant !== undefined && !place?.trim()
      ? [destinationAt(trip, instant)]
      : destinationChoices(trip, value, place)
    : [];
  const selected =
    choices.find((destination) => destination.id === selectedId) ??
    (choices.length === 1 ? choices[0] : undefined);
  return { choices, selected, setSelectedId };
}

export function DestinationPicker({
  defaults,
  label = 'Destination',
}: {
  defaults: ReturnType<typeof useDestinationDefaults>;
  label?: string;
}) {
  const id = useId();
  if (defaults.choices.length < 2) return null;
  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={id} size="2" weight="medium">
        {label}
      </Text>
      <Select.Root
        name={id}
        required
        value={defaults.selected?.id ?? ''}
        onValueChange={defaults.setSelectedId}
      >
        <Select.Trigger id={id} placeholder="Select a destination…" />
        <Select.Content position="popper">
          {defaults.choices.map((destination) => (
            <Select.Item key={destination.id} value={destination.id}>
              {destination.name} · {destination.timeZone}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}
