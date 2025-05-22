import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons';
import { Button, Flex, Popover, Table, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useState } from 'react';
import { useBoundStore } from '../data/store';
import { useTrip } from '../Trip/hooks';
import type { TripSliceExpense } from '../Trip/store/types';
import { dangerToken } from '../ui';
import { dbDeleteExpense } from './db';
import { ExpenseInlineForm } from './ExpenseInlineForm';
import { ExpenseMode } from './ExpenseMode';
import { formatTimestampToReadableDate } from './time';

export function ExpenseRow({ expense }: { expense: TripSliceExpense }) {
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);

  return (
    <Table.Row key={expense.id}>
      {expenseMode === ExpenseMode.View ? (
        <ExpenseRowView expense={expense} setExpenseMode={setExpenseMode} />
      ) : (
        <ExpenseRowEdit expense={expense} setExpenseMode={setExpenseMode} />
      )}
    </Table.Row>
  );
}

function ExpenseRowEdit({
  expense,
  setExpenseMode,
}: {
  expense: TripSliceExpense;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const trip = useTrip(expense.tripId);
  return trip ? (
    <ExpenseInlineForm
      expense={expense}
      trip={trip}
      expenseMode={ExpenseMode.Edit}
      setExpenseMode={setExpenseMode}
    />
  ) : null;
}

function ExpenseRowView({
  expense,
  setExpenseMode,
}: {
  expense: TripSliceExpense;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const trip = useTrip(expense.tripId);
  return (
    <>
      <Table.RowHeaderCell>
        {trip
          ? formatTimestampToReadableDate(
              DateTime.fromMillis(expense.timestampIncurred, {
                zone: trip.timeZone,
              }),
            )
          : ''}
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
                    tripId: expense.tripId,
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
                        error,
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
