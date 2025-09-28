import { Badge, Box, Card, Heading, Text } from '@radix-ui/themes';
import { useMemo } from 'react';
import { useCurrentTrip, useTripExpenses } from '../Trip/store/hooks';
import s from './ExpenseHeaderCard.module.css';

export function ExpenseHeaderCard() {
  const { trip } = useCurrentTrip();

  const expenses = useTripExpenses(trip?.expenseIds ?? []);
  const expenseSummary = useMemo(() => {
    if (!expenses || expenses.length === 0)
      return { total: 0, currency: trip?.originCurrency || 'USD' };

    const total = expenses.reduce((sum, expense) => {
      return sum + (expense.amountInOriginCurrency || expense.amount);
    }, 0);

    return { total, currency: trip?.originCurrency || 'USD' };
  }, [expenses, trip?.originCurrency]);

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
    </Box>
  );
}
