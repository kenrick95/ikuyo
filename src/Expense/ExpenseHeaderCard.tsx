import { Badge, Box, Card, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { getTripStatus } from '../Trip/getTripStatus';
import { useCurrentTrip, useTripExpenses } from '../Trip/store/hooks';
import s from './ExpenseHeaderCard.module.css';

export function ExpenseHeaderCard() {
  const { trip } = useCurrentTrip();

  const expenses = useTripExpenses(trip?.expenseIds ?? []);
  const expenseSummary = useMemo(() => {
    if (!expenses || expenses.length === 0)
      return { total: 0, currency: trip?.originCurrency || 'USD' };

    let total = 0;
    for (const expense of expenses) {
      total += expense.amountInOriginCurrency || expense.amount;
    }

    return { total, currency: trip?.originCurrency || 'USD' };
  }, [expenses, trip?.originCurrency]);

  const dailyExpenseSummary = useMemo(() => {
    if (!trip || !expenses || expenses.length === 0) return null;

    const tripStart = DateTime.fromMillis(trip.timestampStart).setZone(
      trip.timeZone,
    );
    const tripEnd = DateTime.fromMillis(trip.timestampEnd).setZone(
      trip.timeZone,
    );
    const tripStatus = getTripStatus(tripStart, tripEnd);

    // Future trip - don't show this item
    if (!tripStatus || tripStatus.status === 'upcoming') {
      return null;
    }

    let targetDate: DateTime;
    let label: string;

    // Current trip - show today's total
    if (tripStatus.status === 'current') {
      targetDate = DateTime.now().setZone(trip.timeZone).startOf('day');
      label = 'Today';
    }
    // Past trip - show final day's expense
    else {
      // Final day is one day before timestampEnd
      targetDate = tripEnd.minus({ days: 1 }).startOf('day');
      label = 'Final Day';
    }

    const targetExpenses = expenses.filter((expense) => {
      const expenseDate = DateTime.fromMillis(
        expense.timestampIncurred,
      ).setZone(trip.timeZone);
      return expenseDate.hasSame(targetDate, 'day');
    });

    let total = 0;
    for (const expense of targetExpenses) {
      total += expense.amountInOriginCurrency || expense.amount;
    }

    return {
      total,
      count: targetExpenses.length,
      currency: trip.originCurrency || 'USD',
      label,
    };
  }, [expenses, trip]);

  return (
    <Box className={s.expenseHeaderCard}>
      {/* Total */}
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
        <Box className={s.summaryValue}>
          <Badge
            variant="soft"
            color="grass"
            size="1"
            className={s.summaryCurrencyBadge}
          >
            {expenseSummary.currency}
          </Badge>
          <Text size="3" className={s.summaryTotalAmount}>
            {expenseSummary.total.toFixed(2)}
          </Text>
        </Box>
      </Card>
      {/*  Count */}
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
      {/* For current trip, show total for today; for past trips, show final day's expense; for future trip, don't show this item */}
      {dailyExpenseSummary && (
        <Card className={s.summaryItem}>
          <Heading
            as="h4"
            color="gray"
            weight="medium"
            size="2"
            className={s.summaryKey}
          >
            {dailyExpenseSummary.label}
          </Heading>
          <Box className={s.summaryValue}>
            <Badge
              variant="soft"
              color="grass"
              size="1"
              className={s.summaryCurrencyBadge}
            >
              {dailyExpenseSummary.currency}
            </Badge>
            <Text size="3" className={s.summaryTotalAmount}>
              {dailyExpenseSummary.total.toFixed(2)}
            </Text>
          </Box>
        </Card>
      )}
    </Box>
  );
}
