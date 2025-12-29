import { DownloadIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button, Card, Container, Flex, Grid, Heading } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { downloadCsv, expensesToCsv } from '../Expense/csvExport';
import { ExpenseCard } from '../Expense/ExpenseCard';
import { ExpenseHeaderCard } from '../Expense/ExpenseHeaderCard';
import { ExpenseInlineCardForm } from '../Expense/ExpenseInlineCardForm';
import { ExpenseMode } from '../Expense/ExpenseMode';
import { DocTitle } from '../Nav/DocTitle';
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

  const handleExportToCsv = useCallback(() => {
    if (!trip || expenses.length === 0) return;

    const csvContent = expensesToCsv(expenses, trip.timeZone);
    const filename = `${trip.title.replace(/[^a-z0-9]/gi, '_')}_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(csvContent, filename);
  }, [trip, expenses]);

  return (
    <Container py="2" px="2" pb="9">
      <DocTitle title={`${trip?.title ?? 'Trip'} - Expenses`} />
      <Flex justify="between" align="center" mb="3">
        <Heading as="h2" size="4">
          Expenses
        </Heading>
        {/* TODO: how to put this in TripMenu */}
        {expenses.length > 0 && (
          <Button variant="outline" size="2" onClick={handleExportToCsv}>
            <DownloadIcon />
            Export to CSV
          </Button>
        )}
      </Flex>
      <Grid className={s.expenseGrid}>
        <ExpenseHeaderCard />
        {userCanModifyExpense ? (
          expenseMode === ExpenseMode.View ? (
            <Card
              size="1"
              className={clsx(s.addExpenseCard, s.addExpenseCardView)}
              variant="ghost"
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
