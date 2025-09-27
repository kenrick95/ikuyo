import { PlusIcon } from '@radix-ui/react-icons';
import { Button, Card, Container, Grid } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { ExpenseCard } from '../Expense/ExpenseCard';
import { ExpenseInlineCardForm } from '../Expense/ExpenseInlineCardForm';
import { ExpenseMode } from '../Expense/ExpenseMode';
import { TripUserRole } from '../User/TripUserRole';
import { useCurrentTrip, useTripExpenses } from './store/hooks';
import s from './TripExpenseViewCards.module.css';

export function TripExpenseViewCards() {
  const { trip } = useCurrentTrip();
  const expenseIds = trip?.expenseIds ?? [];
  const expenses = useTripExpenses(expenseIds);
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);
  const userCanModifyExpense = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);
  const handleAddExpenseClick = useCallback(() => {
    setExpenseMode(ExpenseMode.Add);
  }, []);

  return (
    <Container py="2" px="2" pb="9">
      <Grid className={s.expenseGrid}>
        {userCanModifyExpense ? (
          expenseMode === ExpenseMode.View ? (
            <Card
              size="1"
              className={clsx(s.addExpenseCard, s.addExpenseCardView)}
            >
              <Button
                variant="outline"
                size="2"
                onClick={handleAddExpenseClick}
              >
                <PlusIcon />
                Add Expense
              </Button>
            </Card>
          ) : (
            <Card className={s.addExpenseCard}>
              {trip ? (
                <ExpenseInlineCardForm
                  trip={trip}
                  expenseMode={ExpenseMode.Add}
                  expense={undefined}
                  setExpenseMode={setExpenseMode}
                />
              ) : null}
            </Card>
          )
        ) : null}
        {expenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} />
        ))}
      </Grid>
    </Container>
  );
}
