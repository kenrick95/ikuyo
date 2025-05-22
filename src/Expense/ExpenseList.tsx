import { PlusIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button, Section, Table, Tooltip } from '@radix-ui/themes';
import { useState } from 'react';
import { useCurrentTrip, useTripExpenses } from '../Trip/hooks';
import { ExpenseInlineForm } from './ExpenseInlineForm';
import s from './ExpenseList.module.css';
import { ExpenseMode } from './ExpenseMode';
import { ExpenseRow } from './ExpenseRow';

export function ExpenseList() {
  const trip = useCurrentTrip();
  const expenseIds = trip?.expenseIds ?? [];
  const expenses = useTripExpenses(expenseIds);
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);

  return (
    <Section py="0">
      <Table.Root>
        <colgroup>
          <col className={s.tableCellDateIncurred} />
          <col className={s.tableCellTitle} />
          <col className={s.tableCellDescription} />
          <col className={s.tableCellCurrency} />
          <col className={s.tableCellAmount} />
          <col className={s.tableCellCurrencyConversionFactor} />
          <col className={s.tableCellAmountInOriginCurrency} />
          <col className={s.tableCellActions} />
        </colgroup>
        <Table.Header className={s.tableHeader}>
          <Table.Row>
            <Table.ColumnHeaderCell>Date Incurred</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Title</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Currency</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              Currency Conversion Factor
              <Tooltip
                content={`How much does 1 unit of origin's currency is worth in the entry's currency. This is equal to "Amount" divided by "Amount in Origin's Currency".`}
              >
                <QuestionMarkCircledIcon
                  style={{ verticalAlign: '-3px', marginLeft: '3px' }}
                />
              </Tooltip>
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>
              Amount in Origin's Currency
              {trip?.originCurrency ? ` (${trip.originCurrency})` : ''}
            </Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell />
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {expenses.map((expense) => (
            <ExpenseRow key={expense.id} expense={expense} />
          ))}

          {expenseMode === ExpenseMode.View ? (
            <Table.Row key={'add'}>
              <Table.Cell colSpan={8} align="center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExpenseMode(ExpenseMode.Add);
                  }}
                >
                  <PlusIcon />
                  Add Expense
                </Button>
              </Table.Cell>
            </Table.Row>
          ) : (
            <Table.Row key={'add'}>
              {trip ? (
                <ExpenseInlineForm
                  trip={trip}
                  expenseMode={ExpenseMode.Add}
                  expense={undefined}
                  setExpenseMode={setExpenseMode}
                />
              ) : null}
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Section>
  );
}
