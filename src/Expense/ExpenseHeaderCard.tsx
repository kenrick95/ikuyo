import { Badge, Box, Card, Heading, Text } from '@radix-ui/themes';
import { getTripStatus } from '../Trip/getTripStatus';
import { useCurrentTrip, useTripExpenses } from '../Trip/store/hooks';
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

export function ExpenseHeaderCard() {
  const { trip } = useCurrentTrip();
  const expenses = useTripExpenses(trip?.expenseIds ?? []);
  const origin = trip?.originCurrency || trip?.currency || 'USD';
  const summary = expenseTotals(expenses, origin);
  if (!expenses.length) summary.totals[trip?.currency || origin] = 0;
  let daily: { label: string; totals: Record<string, number> } | null = null;
  if (trip) {
    const start = Temporal.Instant.fromEpochMilliseconds(
      trip.timestampStart,
    ).toZonedDateTimeISO(trip.timeZone);
    const end = Temporal.Instant.fromEpochMilliseconds(
      trip.timestampEnd,
    ).toZonedDateTimeISO(trip.timeZone);
    const status = getTripStatus(start, end);
    if (status && status.status !== 'upcoming') {
      const target = (
        status.status === 'current'
          ? Temporal.Now.zonedDateTimeISO(trip.timeZone)
          : end.subtract({ days: 1 })
      ).toPlainDate();
      const filtered = expenses.filter((e) =>
        Temporal.Instant.fromEpochMilliseconds(e.timestampIncurred)
          .toZonedDateTimeISO(trip.timeZone)
          .toPlainDate()
          .equals(target),
      );
      daily = {
        label: status.status === 'current' ? 'Today' : 'Final Day',
        totals: expenseTotals(filtered, origin).totals,
      };
      if (!filtered.length) daily.totals[trip.currency] = 0;
    }
  }
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
        <Amounts totals={summary.totals} />
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
      {daily && (
        <Card className={s.summaryItem}>
          <Heading
            as="h4"
            color="gray"
            weight="medium"
            size="2"
            className={s.summaryKey}
          >
            {daily.label}
          </Heading>
          <Amounts totals={daily.totals} />
        </Card>
      )}
    </Box>
  );
}
