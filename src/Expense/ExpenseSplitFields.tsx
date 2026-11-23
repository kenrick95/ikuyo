import { Flex, Select, Switch, Text, TextField } from '@radix-ui/themes';
import { memo, useId, useMemo, useState } from 'react';
import {
  PersonLabel,
  TripPeopleDialog,
  useTripPeople,
} from '../Trip/people/TripPeopleDialog';
import type { TripSliceTrip } from '../Trip/store/types';
import s from './ExpenseSplitFields.module.css';
import {
  type ExpenseLedger,
  formatMinor,
  minorToDecimal,
  previewSplit,
  type SplitMethod,
  toMinor,
} from './ledger';

export const ExpenseSplitFields = memo(function ExpenseSplitFields({
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
  const people = useTripPeople(trip, true);
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const methodId = useId();
  const splitRegionId = useId();
  const [paidInputs, setPaidInputs] = useState<Record<string, string>>({});
  const { method, shares } = value;
  const { preview, error } = useMemo(() => {
    if (method && amount) {
      try {
        return {
          preview: new Map(
            previewSplit(amount, currency, { method, shares }).map((row) => [
              row.participantId,
              row.amountMinor,
            ]),
          ),
          error: '',
        };
      } catch (err) {
        return { error: (err as Error).message };
      }
    }
    return { error: '' };
  }, [amount, currency, method, shares]);
  const contributions = useMemo(
    () =>
      new Map(
        value.contributions?.map((r) => [r.participantId, r.amountMinor]),
      ),
    [value.contributions],
  );
  const patch = (update: Partial<ExpenseLedger>) =>
    onChange({ ...value, ...update });
  return (
    <Flex direction="column" gap="3" className={s.fields}>
      <Text as="label" size="2">
        {value.kind === 'refund' ? 'Received by' : 'Paid by'}
        <Select.Root
          value={value.paidBy}
          onValueChange={(paidBy) => {
            setPaidInputs({});
            patch({ paidBy, contributions: [] });
          }}
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
                {p.id === 'me'
                  ? ' (you)'
                  : !p.hasAccount
                    ? ' · No account'
                    : ''}
              </Select.Item>
            ))}
            <Select.Item value="multiple">Multiple people</Select.Item>
          </Select.Content>
        </Select.Root>
      </Text>
      {value.paidBy === 'multiple' &&
        people.map((p) => (
          <Flex key={p.id} justify="between" align="center" gap="2">
            <PersonLabel person={p} />
            <TextField.Root
              aria-label={`${p.name} paid in ${currency}`}
              style={{ maxWidth: 140 }}
              inputMode="decimal"
              disabled={disabled}
              value={(() => {
                const typed = paidInputs[`${currency}:${p.id}`];
                if (typed !== undefined) return typed;
                const contribution = contributions.get(p.id);
                if (contribution === '') return '';
                try {
                  return minorToDecimal(contribution ?? '0', currency);
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
          <Switch
            aria-controls={value.method ? splitRegionId : undefined}
            checked={value.method !== null}
            disabled={disabled || value.kind === 'refund'}
            onCheckedChange={(checked) =>
              patch({
                method: checked ? 'equal' : null,
                shares:
                  checked && !value.shares.length
                    ? people
                        .filter((p) => !p.archived && p.isParticipant)
                        .map((p) => ({ participantId: p.id }))
                    : value.shares,
              })
            }
          />
          Split expense
        </Flex>
      </Text>
      {value.method && (
        <section
          id={splitRegionId}
          aria-label="Expense split"
          className={s.splitSection}
        >
          <div className={s.controlRow}>
            <Text size="2" className={s.peopleSummary}>
              {value.shares.length ? 'Split among' : 'No people selected'}
            </Text>
            <div className={s.control}>
              <TripPeopleDialog
                trip={trip}
                selected={value.shares.map((row) => row.participantId)}
                disabled={disabled}
                onApply={(ids) => {
                  const sharesById = new Map(
                    value.shares.map((row) => [row.participantId, row]),
                  );
                  patch({
                    shares: ids.map(
                      (participantId) =>
                        sharesById.get(participantId) ?? {
                          participantId,
                          value: value.method === 'shares' ? '1' : '0',
                        },
                    ),
                  });
                }}
              />
            </div>
          </div>
          <div className={s.controlRow}>
            <Text as="label" htmlFor={methodId} size="2">
              Split method
            </Text>
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
              <Select.Trigger id={methodId} className={s.control} />
              <Select.Content>
                <Select.Item value="equal">Equally</Select.Item>
                <Select.Item value="exact">By exact amounts</Select.Item>
                <Select.Item value="percent">By percentage</Select.Item>
                <Select.Item value="shares">By shares</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
          <ul className={s.allocations} aria-label="Split amounts">
            {value.shares.map((row) => {
              const name = peopleById.get(row.participantId)?.name ?? 'Person';
              const allocation = preview?.get(row.participantId);
              return (
                <li className={s.allocationRow} key={row.participantId}>
                  <Text size="2" className={s.personName}>
                    {name}
                  </Text>
                  <div className={s.valueCell}>
                    {value.method === 'equal' ? (
                      <Text size="2" className={s.amount} aria-live="polite">
                        {allocation ? formatMinor(allocation, currency) : '—'}
                      </Text>
                    ) : (
                      <>
                        <div className={s.allocationInput}>
                          <TextField.Root
                            className={s.shareInput}
                            aria-label={`${name} share`}
                            inputMode="decimal"
                            disabled={disabled}
                            value={row.value ?? ''}
                            onChange={(e) =>
                              patch({
                                shares: value.shares.map((r) =>
                                  r === row
                                    ? { ...r, value: e.target.value }
                                    : r,
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
                        </div>
                        {value.method !== 'exact' && allocation && (
                          <Text
                            size="1"
                            color="gray"
                            className={s.amount}
                            aria-live="polite"
                          >
                            {formatMinor(allocation, currency)}
                          </Text>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {error && (
            <Text color="red" size="2" role="alert">
              {error}
            </Text>
          )}
        </section>
      )}
    </Flex>
  );
});
