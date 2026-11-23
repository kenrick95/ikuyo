import { Badge, Box, Card, Heading, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import type { TripSliceExpense, TripSliceTrip } from '../Trip/store/types';
import { formatCurrencyAmount } from './currency';
import s from './ExpenseHeaderCard.module.css';

export function expenseTotals(
  expenses: {
    currency: string;
    amount: number;
    amountInOriginCurrency?: number;
    ledger?: { kind?: string } | null;
  }[],
  originCurrency: string,
) {
  const totals: Record<string, number> = {};
  let converted = 0,
    missing = 0;
  for (const expense of expenses) {
    const sign = expense.ledger?.kind === 'refund' ? -1 : 1;
    totals[expense.currency] =
      (totals[expense.currency] ?? 0) + sign * expense.amount;
    if (expense.currency === originCurrency) converted += sign * expense.amount;
    else if (expense.amountInOriginCurrency != null)
      converted += sign * expense.amountInOriginCurrency;
    else missing++;
  }
  return { totals, converted, missing };
}

function Amounts({ totals }: { totals: Record<string, number> }) {
  return Object.entries(totals).map(([currency, amount]) => (
    <Box key={currency} className={s.summaryValue}>
      <Badge
        variant="soft"
        color="grass"
        size="1"
        className={s.summaryCurrencyBadge}
      >
        {currency}
      </Badge>
      <Text size="3" className={s.summaryTotalAmount}>
        {formatCurrencyAmount(currency, amount)}
      </Text>
    </Box>
  ));
}

export function ExpenseHeaderCard({
  trip,
  expenses,
}: {
  trip: TripSliceTrip | undefined;
  expenses: TripSliceExpense[];
}) {
  const origin = trip?.originCurrency || trip?.currency || 'USD';
  const displayCurrency = trip?.currency || origin;
  const totals = useMemo(
    () =>
      expenses.length
        ? expenseTotals(expenses, origin).totals
        : { [displayCurrency]: 0 },
    [expenses, origin, displayCurrency],
  );
  let label: string | undefined;
  let dayStart: number | undefined;
  let dayEnd: number | undefined;
  if (trip) {
    const now = Temporal.Now.instant();
    if (now.epochMilliseconds >= trip.timestampStart) {
      const isCurrent = now.epochMilliseconds < trip.timestampEnd;
      const day = isCurrent
        ? now.toZonedDateTimeISO(trip.timeZone)
        : Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
            .toZonedDateTimeISO(trip.timeZone)
            .subtract({ days: 1 });
      label = isCurrent ? 'Today' : 'Final Day';
      dayStart = day.startOfDay().epochMilliseconds;
      dayEnd = day.add({ days: 1 }).startOfDay().epochMilliseconds;
    }
  }
  const dailyTotals = useMemo(() => {
    if (dayStart === undefined || dayEnd === undefined) return null;
    const filtered = expenses.filter(
      (expense) =>
        expense.timestampIncurred >= dayStart &&
        expense.timestampIncurred < dayEnd,
    );
    return filtered.length
      ? expenseTotals(filtered, origin).totals
      : { [displayCurrency]: 0 };
  }, [expenses, origin, displayCurrency, dayStart, dayEnd]);
  return (
    <Box className={s.expenseHeaderCard}>
      <Card className={s.summaryItem}>
        <Heading
          as="h4"
          color="gray"
          weight="medium"
          size="2"
          className={s.summaryKey}
        >
          Total
        </Heading>
        <Amounts totals={totals} />
      </Card>
      <Card className={s.summaryItem}>
        <Heading
          as="h4"
          color="gray"
          weight="medium"
          size="2"
          className={s.summaryKey}
        >
          Entries
        </Heading>
        <Box className={s.summaryValue}>
          <Text size="3" className={s.summaryTotalAmount}>
            {expenses.length}
          </Text>
        </Box>
      </Card>
      {dailyTotals && (
        <Card className={s.summaryItem}>
          <Heading
            as="h4"
            color="gray"
            weight="medium"
            size="2"
            className={s.summaryKey}
          >
            {label}
          </Heading>
          <Amounts totals={dailyTotals} />
        </Card>
      )}
    </Box>
  );
}
