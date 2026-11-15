import { Box, Checkbox, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import type { TripSliceTrip } from '../Trip/store/types';
import {
  ExpensePeopleDialog,
  ParticipantLabel,
  useExpensePeople,
} from './ExpensePeopleDialog';
import {
  type ExpenseLedger,
  formatMinor,
  minorToDecimal,
  previewSplit,
  type SplitMethod,
  toMinor,
} from './ledger';

export function ExpenseSplitFields({
  trip,
  amount,
  currency,
  value,
  onChange,
  disabled,
}: {
  trip: TripSliceTrip;
  amount: string;
  currency: string;
  value: ExpenseLedger;
  onChange: (ledger: ExpenseLedger) => void;
  disabled: boolean;
}) {
  const people = useExpensePeople(trip);
  const [paidInputs, setPaidInputs] = useState<Record<string, string>>({});
  let preview: { participantId: string; amountMinor: string }[] = [],
    error = '';
  if (value.method && amount) {
    try {
      preview = previewSplit(amount, currency, value);
    } catch (err) {
      error = (err as Error).message;
    }
  }
  const patch = (update: Partial<ExpenseLedger>) =>
    onChange({ ...value, ...update });
  return (
    <Flex direction="column" gap="3">
      <Text as="label" size="2">
        {value.kind === 'refund' ? 'Received by' : 'Paid by'}
        <Select.Root
          value={value.paidBy}
          onValueChange={(paidBy) => patch({ paidBy })}
          disabled={disabled}
        >
          <Select.Trigger style={{ width: '100%' }} mt="1" />
          <Select.Content>
            {people.map((p) => (
              <Select.Item
                key={p.id}
                value={p.id}
                disabled={p.archived && value.paidBy !== p.id}
              >
                {p.name}
                {p.id === 'me' ? ' (you)' : p.guest ? ' · Guest' : ''}
              </Select.Item>
            ))}
            <Select.Item value="multiple">Multiple people</Select.Item>
          </Select.Content>
        </Select.Root>
      </Text>
      {value.paidBy === 'multiple' &&
        people.map((p) => (
          <Flex key={p.id} justify="between" align="center" gap="2">
            <ParticipantLabel person={p} />
            <TextField.Root
              aria-label={`${p.name} paid in ${currency}`}
              style={{ maxWidth: 140 }}
              inputMode="decimal"
              disabled={disabled}
              value={(() => {
                const typed = paidInputs[`${currency}:${p.id}`];
                if (typed !== undefined) return typed;
                try {
                  return minorToDecimal(
                    value.contributions?.find((r) => r.participantId === p.id)
                      ?.amountMinor || '0',
                    currency,
                  );
                } catch {
                  return '';
                }
              })()}
              onChange={(e) => {
                const typed = e.target.value;
                setPaidInputs((previous) => ({
                  ...previous,
                  [`${currency}:${p.id}`]: typed,
                }));
                let amountMinor = '';
                try {
                  amountMinor = toMinor(typed || '0', currency);
                } catch {
                  // An invalid contribution stays visible and fails server validation.
                }
                patch({
                  contributions: [
                    ...(value.contributions ?? []).filter(
                      (r) => r.participantId !== p.id,
                    ),
                    { participantId: p.id, amountMinor },
                  ],
                });
              }}
            />
          </Flex>
        ))}
      <Text as="label" size="2">
        <Flex align="center" gap="2">
          <Checkbox
            checked={value.method !== null}
            disabled={disabled || value.kind === 'refund'}
            onCheckedChange={(checked) =>
              patch({
                method: checked ? 'equal' : null,
                shares:
                  checked && !value.shares.length
                    ? people
                        .filter((p) => !p.archived)
                        .map((p) => ({ participantId: p.id }))
                    : value.shares,
              })
            }
          />
          Split expense
        </Flex>
      </Text>
      {value.method && (
        <Box
          p="3"
          style={{
            background: 'var(--gray-2)',
            borderRadius: 'var(--radius-2)',
          }}
        >
          <Flex align="center" justify="between" gap="2" wrap="wrap" mb="3">
            <Text size="2">
              {value.shares
                .map(
                  (row) =>
                    people.find((p) => p.id === row.participantId)?.name ??
                    'Person',
                )
                .join(', ') || 'No people selected'}
            </Text>
            <ExpensePeopleDialog
              trip={trip}
              selected={value.shares.map((r) => r.participantId)}
              disabled={disabled}
              onApply={(ids) =>
                patch({
                  shares: ids.map(
                    (participantId) =>
                      value.shares.find(
                        (r) => r.participantId === participantId,
                      ) ?? {
                        participantId,
                        value: value.method === 'shares' ? '1' : '0',
                      },
                  ),
                })
              }
            />
          </Flex>
          <Select.Root
            value={value.method}
            disabled={disabled}
            onValueChange={(method) =>
              patch({
                method: method as SplitMethod,
                shares: value.shares.map((row, i) => ({
                  participantId: row.participantId,
                  value:
                    method === 'shares'
                      ? '1'
                      : method === 'percent' && i === 0
                        ? '100'
                        : '0',
                })),
              })
            }
          >
            <Select.Trigger aria-label="Split method" />
            <Select.Content>
              <Select.Item value="equal">Equally</Select.Item>
              <Select.Item value="exact">By exact amounts</Select.Item>
              <Select.Item value="percent">By percentage</Select.Item>
              <Select.Item value="shares">By shares</Select.Item>
            </Select.Content>
          </Select.Root>
          {value.method !== 'equal' &&
            value.shares.map((row) => (
              <Flex
                key={row.participantId}
                justify="between"
                align="center"
                gap="2"
                mt="2"
              >
                <Text size="2">
                  {people.find((p) => p.id === row.participantId)?.name}
                </Text>
                <Flex align="center" gap="2">
                  <TextField.Root
                    style={{ maxWidth: 120 }}
                    aria-label={`${people.find((p) => p.id === row.participantId)?.name} share`}
                    inputMode="decimal"
                    disabled={disabled}
                    value={row.value ?? ''}
                    onChange={(e) =>
                      patch({
                        shares: value.shares.map((r) =>
                          r === row ? { ...r, value: e.target.value } : r,
                        ),
                      })
                    }
                  />
                  <Text size="1">
                    {value.method === 'percent'
                      ? '%'
                      : value.method === 'shares'
                        ? 'shares'
                        : currency}
                  </Text>
                </Flex>
              </Flex>
            ))}
          <Flex direction="column" gap="2" mt="3" aria-live="polite">
            {preview.map((row) => (
              <Flex justify="between" gap="2" key={row.participantId}>
                <Text size="2">
                  {people.find((p) => p.id === row.participantId)?.name}
                </Text>
                <Text size="2">{formatMinor(row.amountMinor, currency)}</Text>
              </Flex>
            ))}
            {error && (
              <Text color="red" size="2" role="alert">
                {error}
              </Text>
            )}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}
