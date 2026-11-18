import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  Flex,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useId, useRef, useState } from 'react';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
import { deleteMutation, postMutation } from '../data/apiClient';
import { id } from '../data/id';
import { ALL_CURRENCIES } from '../data/intl/currencies';
import { useBoundStore } from '../data/store';
import { PersonLabel } from '../Trip/people/TripPeopleDialog';
import { canModifyTripContent } from '../Trip/permissions';
import type { TripSliceTrip } from '../Trip/store/types';
import { downloadCsv, ledgerStatementToCsv } from './csvExport';
import { ExpenseHistory } from './ExpenseHistory';
import {
  formatMinor,
  minorToDecimal,
  type Settlement,
  toMinor,
} from './ledger';

type PaymentDraft = Omit<Settlement, 'amountMinor' | 'voided'> & {
  amount: string;
  custom?: boolean;
  crossCurrency?: boolean;
  paidAmount?: string;
};
export function ExpenseBalancesDialog({ trip }: { trip: TripSliceTrip }) {
  const data = trip.expenseLedger;
  const paymentCurrencyId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [voiding, setVoiding] = useState<string | null>(null);
  const submitting = useRef(false);
  const refreshTrip = useBoundStore((state) => state.refreshTrip);
  const editable = canModifyTripContent(trip);
  const participants = trip.people ?? [];
  const person = (id: string) => participants.find((p) => p.id === id);
  const title = (id: string) => person(id)?.name ?? 'Person';
  function settle(
    currency: string,
    row: { senderId: string; recipientId: string; amountMinor: string },
    custom = false,
  ) {
    if (loading || needsRefresh || submitting.current) return;
    setError('');
    setVoiding(null);
    setDraft({
      ...row,
      id: id(),
      currency,
      amount: minorToDecimal(row.amountMinor, currency),
      date: Temporal.Now.plainDateISO(trip.timeZone).toString(),
      note: '',
      custom,
      paidCurrency: currency,
      paidAmount: '',
      crossCurrency: false,
    });
  }
  async function save() {
    if (!draft || submitting.current) return;
    setError('');
    try {
      const amountMinor = toMinor(draft.amount, draft.currency);
      if (BigInt(amountMinor) <= 0n)
        throw new Error('Amount must be greater than zero.');
      if (draft.senderId === draft.recipientId)
        throw new Error('Choose two different people.');
      if (!draft.date) throw new Error('Choose a date.');
      let paidAmountMinor = amountMinor;
      if (draft.crossCurrency) {
        if (!draft.paidCurrency || draft.paidCurrency === draft.currency)
          throw new Error('Choose a different payment currency.');
        paidAmountMinor = toMinor(draft.paidAmount || '', draft.paidCurrency);
        if (BigInt(paidAmountMinor) <= 0n)
          throw new Error('Enter a positive payment amount.');
      }
      submitting.current = true;
      setLoading(true);
      await postMutation(
        `/api/trips/${encodeURIComponent(trip.id)}/expense-payments`,
        {
          ...draft,
          amountMinor,
          paidCurrency: draft.crossCurrency
            ? draft.paidCurrency
            : draft.currency,
          paidAmountMinor,
        },
      );
      setDraft(null);
      setNeedsRefresh(true);
      await refreshTrip(trip.id);
      setNeedsRefresh(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to record payment.',
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  async function voidPayment(payment: string) {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await deleteMutation(
        `/api/trips/${encodeURIComponent(trip.id)}/expense-payments/${encodeURIComponent(payment)}`,
      );
      setVoiding(null);
      setNeedsRefresh(true);
      await refreshTrip(trip.id);
      setNeedsRefresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to void payment.');
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  async function retryRefresh() {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await refreshTrip(trip.id);
      setNeedsRefresh(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to refresh balances.',
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }
  let result = '';
  if (draft) {
    try {
      const n = BigInt(toMinor(draft.amount, draft.currency));
      const balance =
        BigInt(
          data?.currencies
            .find((c) => c.currency === draft.currency)
            ?.balances.find((b) => b.participantId === draft.senderId)
            ?.amountMinor ?? '0',
        ) + n;
      result = `${title(draft.senderId)} ${balance > 0n ? 'will be owed' : 'will owe'} ${formatMinor((balance < 0n ? -balance : balance).toString(), draft.currency)}`;
    } catch {
      /* Inline validation occurs on submit. */
    }
  }
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        setOpen(next);
        setDraft(null);
        setVoiding(null);
        setError('');
      }}
    >
      <Dialog.Trigger>
        <Button variant="outline" color="gray" size="2" type="button">
          Balances
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="500px" aria-describedby={undefined}>
        <Dialog.Title>{draft ? 'Settle balance' : 'Balances'}</Dialog.Title>
        {draft ? (
          <Flex direction="column" gap="3">
            <Flex gap="3" wrap="wrap">
              {(['senderId', 'recipientId'] as const).map((key) => (
                <Text
                  as="label"
                  size="2"
                  key={key}
                  style={{ flex: 1, minWidth: 140 }}
                >
                  {key === 'senderId' ? 'Paid by' : 'Paid to'}
                  <Select.Root
                    value={draft[key]}
                    disabled={loading}
                    onValueChange={(value) =>
                      setDraft({ ...draft, [key]: value })
                    }
                  >
                    <Select.Trigger style={{ width: '100%' }} mt="1" />
                    <Select.Content>
                      {participants.map((p) => (
                        <Select.Item key={p.id} value={p.id}>
                          {p.name}
                          {!p.hasAccount ? ' · No account' : ''}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Text>
              ))}
            </Flex>
            {draft.custom && (
              <Text as="label" size="2">
                Currency
                <Select.Root
                  value={draft.currency}
                  disabled={loading}
                  onValueChange={(currency) =>
                    setDraft({ ...draft, currency, amount: '' })
                  }
                >
                  <Select.Trigger mt="1" />
                  <Select.Content>
                    {ALL_CURRENCIES.map((currency) => (
                      <Select.Item key={currency} value={currency}>
                        {currency}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Text>
            )}
            <Text as="label" size="2">
              {draft.crossCurrency ? 'Debt cleared' : 'Amount'} ·{' '}
              {draft.currency}
              <TextField.Root
                value={draft.amount}
                inputMode="decimal"
                mt="1"
                disabled={loading}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </Text>
            <Text as="label" size="2">
              <Flex align="center" gap="2">
                <Checkbox
                  checked={!!draft.crossCurrency}
                  disabled={loading}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, crossCurrency: checked === true })
                  }
                />
                Paid in another currency
              </Flex>
            </Text>
            {draft.crossCurrency && (
              <>
                <Flex direction="column" gap="1">
                  <Text as="label" htmlFor={paymentCurrencyId} size="2">
                    Payment currency
                  </Text>
                  <Select.Root
                    value={draft.paidCurrency}
                    disabled={loading}
                    onValueChange={(currency) =>
                      setDraft({
                        ...draft,
                        paidCurrency: currency,
                        paidAmount: '',
                      })
                    }
                  >
                    <Select.Trigger
                      id={paymentCurrencyId}
                      style={{ width: '100%' }}
                    />
                    <Select.Content>
                      {ALL_CURRENCIES.filter((c) => c !== draft.currency).map(
                        (c) => (
                          <Select.Item key={c} value={c}>
                            {c}
                          </Select.Item>
                        ),
                      )}
                    </Select.Content>
                  </Select.Root>
                </Flex>
                <Text as="label" size="2">
                  Amount paid · {draft.paidCurrency}
                  <TextField.Root
                    inputMode="decimal"
                    value={draft.paidAmount ?? ''}
                    disabled={loading}
                    onChange={(e) =>
                      setDraft({ ...draft, paidAmount: e.target.value })
                    }
                    mt="1"
                  />
                </Text>
                {draft.paidAmount && (
                  <Text size="2">
                    {draft.amount} {draft.currency} cleared for{' '}
                    {draft.paidAmount} {draft.paidCurrency}
                  </Text>
                )}
              </>
            )}
            <Flex direction="column" gap="1">
              <Text size="2">Date</Text>
              <DateTimePicker
                aria-label="Date"
                mode={DateTimePickerMode.Date}
                value={
                  draft.date ? Temporal.PlainDate.from(draft.date) : undefined
                }
                disabled={loading}
                required
                onChange={(date) =>
                  setDraft({
                    ...draft,
                    date: date?.toString().slice(0, 10) ?? '',
                  })
                }
              />
            </Flex>
            <Text as="label" size="2">
              Note
              <TextField.Root
                value={draft.note}
                placeholder="Optional"
                maxLength={500}
                mt="1"
                disabled={loading}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Text>
            <Text size="1" color="gray" aria-live="polite">
              {result}
            </Text>
          </Flex>
        ) : (
          <Flex direction="column" gap="4">
            <ExpenseHistory tripId={trip.id} timeZone={trip.timeZone} />
            {data && data.splitCount < data.expenseCount && (
              <Text size="1" color="gray">
                {data.splitCount} of {data.expenseCount} expenses split
              </Text>
            )}
            {!data?.currencies.length && (
              <Text color="gray" size="2">
                No split expenses.
              </Text>
            )}
            {data?.currencies.map((group) => (
              <Flex key={group.currency} direction="column" gap="3">
                <Text weight="medium">{group.currency}</Text>
                {group.balances.map((row) => {
                  const p = person(row.participantId),
                    n = BigInt(row.amountMinor);
                  return (
                    <Flex
                      key={row.participantId}
                      align="center"
                      justify="between"
                      gap="2"
                      wrap="wrap"
                    >
                      {p && <PersonLabel person={p} />}
                      <Text size="2">
                        {n === 0n
                          ? 'Settled'
                          : `${n > 0n ? 'Owed' : 'Owes'} ${formatMinor((n < 0n ? -n : n).toString(), group.currency)}`}
                      </Text>
                    </Flex>
                  );
                })}
                {group.suggestions.length ? (
                  <>
                    <Text weight="medium" size="2" mt="2">
                      Settle balances
                    </Text>
                    {group.suggestions.map((row) => (
                      <Flex
                        key={`${row.senderId}-${row.recipientId}`}
                        align="center"
                        justify="between"
                        gap="2"
                        wrap="wrap"
                      >
                        <Text size="2">
                          {title(row.senderId)} → {title(row.recipientId)}
                          <br />
                          {formatMinor(row.amountMinor, group.currency)}
                        </Text>
                        {editable && (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={loading || needsRefresh}
                            onClick={() => settle(group.currency, row)}
                          >
                            Settle
                          </Button>
                        )}
                      </Flex>
                    ))}
                  </>
                ) : (
                  <Badge color="gray">All settled</Badge>
                )}
              </Flex>
            ))}
            {!!data?.payments.length && (
              <details>
                <summary>Settlements ({data.payments.length})</summary>
                <Flex direction="column" gap="3" mt="3">
                  {data.payments.map((payment) => (
                    <Flex
                      key={payment.id}
                      align="center"
                      justify="between"
                      gap="2"
                      wrap="wrap"
                    >
                      <Text size="2">
                        {title(payment.senderId)} → {title(payment.recipientId)}{' '}
                        · {formatMinor(payment.amountMinor, payment.currency)}
                        {payment.paidCurrency &&
                          payment.paidCurrency !== payment.currency && (
                            <>
                              <br />
                              Paid{' '}
                              {formatMinor(
                                payment.paidAmountMinor ?? payment.amountMinor,
                                payment.paidCurrency,
                              )}
                            </>
                          )}
                        <br />
                        <Text size="1" color="gray">
                          {payment.date}
                          {payment.note ? ` · ${payment.note}` : ''}
                          {payment.voided ? ' · Voided' : ''}
                        </Text>
                      </Text>
                      {editable &&
                        !payment.voided &&
                        (voiding === payment.id ? (
                          <Flex gap="2">
                            <Button
                              type="button"
                              color="red"
                              disabled={loading || needsRefresh}
                              onClick={() => void voidPayment(payment.id)}
                            >
                              Confirm void
                            </Button>
                            <Button
                              type="button"
                              variant="soft"
                              disabled={loading}
                              onClick={() => setVoiding(null)}
                            >
                              Cancel
                            </Button>
                          </Flex>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={loading || needsRefresh}
                            onClick={() => setVoiding(payment.id)}
                          >
                            Void
                          </Button>
                        ))}
                    </Flex>
                  ))}
                </Flex>
              </details>
            )}
          </Flex>
        )}
        {error && (
          <Text as="p" color="red" size="2" mt="3" role="alert">
            {error}
          </Text>
        )}
        {needsRefresh && (
          <Button
            type="button"
            variant="outline"
            mt="3"
            loading={loading}
            onClick={() => void retryRefresh()}
          >
            Refresh balances
          </Button>
        )}
        <Flex justify="end" gap="2" mt="5">
          {draft ? (
            <>
              <Button
                type="button"
                variant="soft"
                color="gray"
                disabled={loading}
                onClick={() => {
                  setDraft(null);
                  setError('');
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                loading={loading}
                onClick={() => void save()}
              >
                Record payment
              </Button>
            </>
          ) : (
            <>
              {data && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    downloadCsv(
                      ledgerStatementToCsv(data, trip.people),
                      'trip-balances.csv',
                    )
                  }
                >
                  Export
                </Button>
              )}
              {editable && participants.length >= 2 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || needsRefresh}
                  onClick={() =>
                    settle(
                      data?.currencies[0]?.currency ?? trip.currency,
                      {
                        senderId: participants[0].id,
                        recipientId: participants[1].id,
                        amountMinor: '0',
                      },
                      true,
                    )
                  }
                >
                  Record settlement
                </Button>
              )}
              <Dialog.Close>
                <Button type="button">Done</Button>
              </Dialog.Close>
            </>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
