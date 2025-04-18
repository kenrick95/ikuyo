import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Table, Text, Popover, Button, Flex } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { dbDeleteExpense, DbExpense } from './db';
import { formatTimestampToReadableDate } from './time';
import { DbTripWithActivityAccommodation } from '../Trip/db';
import { useBoundStore } from '../data/store';
import { useState } from 'react';
import { ExpenseMode } from './ExpenseMode';
import { ExpenseInlineForm } from './ExpenseInlineForm';
import { dangerToken } from '../ui';

export function ExpenseRow({
  expense,
  trip,
}: {
  expense: DbExpense;
  trip: DbTripWithActivityAccommodation;
}) {
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);

  return (
    <Table.Row key={expense.id}>
      {expenseMode === ExpenseMode.View ? (
        <ExpenseRowView
          expense={expense}
          trip={trip}
          setExpenseMode={setExpenseMode}
        />
      ) : (
        <ExpenseRowEdit
          expense={expense}
          trip={trip}
          setExpenseMode={setExpenseMode}
        />
      )}
    </Table.Row>
  );
}

function ExpenseRowEdit({
  expense,
  trip,
  setExpenseMode,
}: {
  expense: DbExpense;
  trip: DbTripWithActivityAccommodation;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  return (
    <ExpenseInlineForm
      expense={expense}
      expenseMode={ExpenseMode.Edit}
      trip={trip}
      setExpenseMode={setExpenseMode}
    />
  );
}

function ExpenseRowView({
  expense,
  trip,
  setExpenseMode,
}: {
  expense: DbExpense;
  trip: DbTripWithActivityAccommodation;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  return (
    <>
      <Table.RowHeaderCell>
        {formatTimestampToReadableDate(
          DateTime.fromMillis(expense.timestampIncurred)
        )}
      </Table.RowHeaderCell>
      <Table.Cell>{expense.title}</Table.Cell>
      <Table.Cell>{expense.description}</Table.Cell>
      <Table.Cell>{expense.currency}</Table.Cell>
      <Table.Cell>{expense.amount}</Table.Cell>
      <Table.Cell>{expense.currencyConversionFactor}</Table.Cell>
      <Table.Cell>{expense.amountInOriginCurrency}</Table.Cell>
      <Table.Cell>
        <Button
          variant="outline"
          aria-label="Edit expense"
          mr="2"
          mb="2"
          onClick={() => {
            setExpenseMode(ExpenseMode.Edit);
          }}
        >
          <Pencil1Icon />
        </Button>
        {/* TODO: implement Edit, make it inline edit? */}
        <Popover.Root>
          <Popover.Trigger>
            <Button variant="outline">
              <TrashIcon />
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <Text as="p" size="2">
              Delete expense "{expense.title}"?
            </Text>
            <Text as="p" size="2" color={dangerToken}>
              {/* TODO: implement undo delete */}
              This action is irreversible!
            </Text>
            <Flex gap="3" mt="4" justify="end">
              <Popover.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Popover.Close>
              <Button
                variant="solid"
                color={dangerToken}
                onClick={() => {
                  dbDeleteExpense({
                    expenseId: expense.id,
                    tripId: trip.id,
                  })
                    .then(() => {
                      publishToast({
                        root: {},
                        title: {
                          children: `Deleted expense: ${expense.title}`,
                        },
                        close: {},
                      });
                    })
                    .catch((error: unknown) => {
                      console.error(
                        `Error deleting expense "${expense.title}"`,
                        error
                      );
                      publishToast({
                        root: {},
                        title: {
                          children: `Error deleting expense: ${expense.title}`,
                        },
                        close: {},
                      });
                    });
                }}
              >
                Delete
              </Button>
            </Flex>
          </Popover.Content>
        </Popover.Root>
      </Table.Cell>
    </>
  );
}
