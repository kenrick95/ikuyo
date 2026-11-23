import { DownloadIcon, LockClosedIcon, PlusIcon } from '@radix-ui/react-icons';
import {
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { useDeepBoundStore } from '../data/store';
import { downloadCsv, expensesToCsv } from '../Expense/csvExport';
import { ExpenseBalancesDialog } from '../Expense/ExpenseBalancesDialog';
import { ExpenseCard } from '../Expense/ExpenseCard';
import { ExpenseHeaderCard } from '../Expense/ExpenseHeaderCard';
import { ExpenseInlineCardForm } from '../Expense/ExpenseInlineCardForm';
import { ExpenseMode } from '../Expense/ExpenseMode';
import { DocTitle } from '../Nav/DocTitle';
import { TripPeopleDialog } from './people/TripPeopleDialog';
import { canModifyTripContent } from './permissions';
import { getSectionVisibility } from './sectionVisibility';
import { useTripExpenses } from './store/hooks';
import s from './TripExpenseViewCards.module.css';

export function TripExpenseViewCards() {
  const trip = useDeepBoundStore((state) => state.getCurrentTrip());
  const sectionVisibility = trip ? getSectionVisibility(trip) : null;
  const expenses = useTripExpenses(trip?.expenseIds);
  const peopleById = useMemo(
    () => new Map(trip?.people?.map((person) => [person.id, person])),
    [trip?.people],
  );
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);
  const userCanModifyExpense = canModifyTripContent(trip);
  const handleAddExpenseClick = useCallback(() => {
    setExpenseMode(ExpenseMode.Add);
  }, []);

  const handleExportToCsv = useCallback(() => {
    if (!trip || expenses.length === 0) return;

    const csvContent = expensesToCsv(expenses, trip.timeZone, trip.people);
    const filename = `${trip.title.replace(/[^a-z0-9]/gi, '_')}_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsv(csvContent, filename);
  }, [trip, expenses]);

  return (
    <Container py="2" px="2" pb="9">
      <DocTitle title={`${trip?.title ?? 'Trip'} - Expenses`} />
      {sectionVisibility?.expenses === false ? (
        <Flex align="center" justify="center" gap="2" py="9">
          <LockClosedIcon />
          <Text color="gray">Expenses are hidden for this trip.</Text>
        </Flex>
      ) : (
        <>
          <Flex justify="between" align="center" mb="3" gap="2" wrap="wrap">
            <Heading as="h2" size="4">
              Expenses
            </Heading>
            <Flex gap="2" wrap="wrap" justify="end">
              {trip && userCanModifyExpense && <TripPeopleDialog trip={trip} />}
              {trip && <ExpenseBalancesDialog trip={trip} />}
              {expenses.length > 0 && (
                <Button
                  variant="outline"
                  color="gray"
                  size="2"
                  onClick={handleExportToCsv}
                >
                  <DownloadIcon />
                  Export to CSV
                </Button>
              )}
            </Flex>
          </Flex>
          <Grid className={s.expenseGrid}>
            <ExpenseHeaderCard trip={trip} expenses={expenses} />
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
              <ExpenseCard
                key={expense.id}
                expense={expense}
                peopleById={peopleById}
              />
            ))}
          </Grid>
        </>
      )}
    </Container>
  );
}
