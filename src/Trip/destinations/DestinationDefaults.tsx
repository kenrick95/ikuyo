import { Flex, Select, Text } from '@radix-ui/themes';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { type DestinationItinerary, destinationChoices } from './destinations';

/**
 * Suggests a destination for a form and tracks the user's choice if several fit.
 * The optional prefilled instant identifies the exact time while the original
 * wall time is still selected.
 */
export function useDestinationDefaults(
  destinations: DestinationItinerary | undefined,
  value: Temporal.PlainDateTime | undefined,
  place?: string,
  prefilledInstant?: Temporal.Instant,
) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelected] = useState('');
  const choices = destinations
    ? destinationChoices(destinations, value, place, prefilledInstant)
    : [];
  const selected =
    choices.find((destination) => destination.id === selectedId) ??
    (choices.length === 1 ? choices[0] : undefined);
  const unresolved = choices.length > 1 && !selected;
  const failedAttempt = unresolved ? attempt : 0;
  useEffect(() => {
    if (failedAttempt > 0) trigger.current?.focus();
  }, [failedAttempt]);
  const setSelectedId = useCallback((id: string) => {
    setSelected(id);
    setAttempt(0);
  }, []);
  const validate = useCallback(() => {
    if (unresolved) setAttempt((current) => current + 1);
    return !unresolved;
  }, [unresolved]);
  return {
    choices,
    selected,
    setSelectedId,
    trigger,
    invalid: failedAttempt > 0,
    validate,
  };
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
        value={defaults.selected?.id ?? ''}
        onValueChange={defaults.setSelectedId}
      >
        <Select.Trigger
          id={id}
          ref={defaults.trigger}
          placeholder="Select a destination…"
          aria-required="true"
          aria-invalid={defaults.invalid}
          aria-describedby={defaults.invalid ? `${id}-error` : undefined}
        />
        <Select.Content position="popper">
          {defaults.choices.map((destination) => (
            <Select.Item key={destination.id} value={destination.id}>
              {destination.name} · {destination.timeZone}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      {defaults.invalid && (
        <Text id={`${id}-error`} color="red" size="2">
          Choose a destination for this time.
        </Text>
      )}
    </Flex>
  );
}
