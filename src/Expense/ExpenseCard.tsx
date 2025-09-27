import {
  ChevronDownIcon,
  ChevronRightIcon,
  Pencil1Icon,
  QuestionMarkCircledIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import {
  Badge,
  Button,
  Card,
  Flex,
  Inset,
  Popover,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useState } from 'react';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import { useTrip } from '../Trip/store/hooks';
import type { TripSliceExpense } from '../Trip/store/types';
import { dbDeleteExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseInlineCardForm } from './ExpenseInlineCardForm';
import { ExpenseMode } from './ExpenseMode';
import { formatTimestampToReadableDate } from './time';

export function ExpenseCard({ expense }: { expense: TripSliceExpense }) {
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card size="2" key={expense.id} className={s.expenseCard}>
      {expenseMode === ExpenseMode.View ? (
        <ExpenseCardView
          expense={expense}
          setExpenseMode={setExpenseMode}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
      ) : (
        <ExpenseCardEdit expense={expense} setExpenseMode={setExpenseMode} />
      )}
    </Card>
  );
}

function ExpenseCardEdit({
  expense,
  setExpenseMode,
}: {
  expense: TripSliceExpense;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const { trip } = useTrip(expense.tripId);
  return trip ? (
    <ExpenseInlineCardForm
      expense={expense}
      trip={trip}
      expenseMode={ExpenseMode.Edit}
      setExpenseMode={setExpenseMode}
    />
  ) : null;
}

function ExpenseCardView({
  expense,
  setExpenseMode,
  isExpanded,
  setIsExpanded,
}: {
  expense: TripSliceExpense;
  setExpenseMode: (mode: ExpenseMode) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const { trip } = useTrip(expense.tripId);

  const handleClick = useCallback(
    (_e: React.MouseEvent<HTMLButtonElement>) => {
      setIsExpanded(!isExpanded);
    },
    [isExpanded, setIsExpanded],
  );
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsExpanded(!isExpanded);
      }
    },
    [isExpanded, setIsExpanded],
  );

  const handleEditExpense = useCallback(() => {
    setExpenseMode(ExpenseMode.Edit);
  }, [setExpenseMode]);

  const handleDeleteExpense = useCallback(() => {
    dbDeleteExpense(expense.id)
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
        console.error(`Error deleting expense "${expense.title}"`, error);
        publishToast({
          root: {},
          title: {
            children: `Error deleting expense: ${expense.title}`,
          },
          close: {},
        });
      });
  }, [expense.id, expense.title, publishToast]);

  return (
    <Inset className={s.cardContent}>
      {/* Collapsed Header - Always Visible */}
      <button
        className={s.collapsedHeader}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        type="button"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} expense details for ${expense.title}`}
      >
        <div className={s.collapsedContent}>
          <div className={s.collapsedLeft}>
            <Text size="1" color="gray" className={s.date}>
              {trip
                ? formatTimestampToReadableDate(
                    DateTime.fromMillis(expense.timestampIncurred, {
                      zone: trip.timeZone,
                    }),
                  )
                : ''}
            </Text>
            <Text size="3" weight="bold" className={s.title}>
              {expense.title}
            </Text>
          </div>
          <div className={s.collapsedRight}>
            <div className={s.amountDisplay}>
              <Badge variant="soft" size="1">
                {expense.currency}
              </Badge>
              <Text size="4" weight="bold">
                {expense.amount.toFixed(2)}
              </Text>
            </div>
            {isExpanded ? (
              <ChevronDownIcon className={s.expandButton} />
            ) : (
              <ChevronRightIcon className={s.expandButton} />
            )}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className={s.expandedContent}>
          {/* Description */}
          {expense.description && (
            <div className={s.detailSection}>
              <Text
                size="1"
                color="gray"
                weight="medium"
                className={s.detailLabel}
              >
                Description
              </Text>
              <Text size="2" className={s.description}>
                {expense.description}
              </Text>
            </div>
          )}

          {/* Currency Conversion Details */}
          {expense.currencyConversionFactor != null &&
            expense.amountInOriginCurrency != null && (
              <div className={s.detailSection}>
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  className={s.detailLabel}
                >
                  Currency Conversion
                </Text>
                <div className={s.conversionInfo}>
                  <div className={s.conversionRow}>
                    <Text size="2" color="gray">
                      Amount in Destination's Currency ({trip?.currency}) :
                    </Text>
                    <Flex align="center" gap="1">
                      <Text size="2">{expense.amount?.toFixed(2)}</Text>
                    </Flex>
                  </div>
                  <div className={s.conversionRow}>
                    <Text size="2" color="gray">
                      Conversion Factor{' '}
                      <Tooltip
                        content={`How much does 1 unit of origin's currency is worth in the entry's currency. This is equal to "Amount" divided by "Amount in Origin's Currency".`}
                      >
                        <QuestionMarkCircledIcon className={s.tooltipIcon} />
                      </Tooltip>{' '}
                      :
                    </Text>
                    <Flex align="center" gap="1">
                      <Text size="2">
                        {expense.currencyConversionFactor?.toFixed(2)}
                      </Text>
                    </Flex>
                  </div>
                  <div className={s.conversionRow}>
                    <Text size="2" color="gray">
                      Amount in Origin's Currency
                      {trip?.originCurrency ? ` (${trip.originCurrency})` : ''}:
                    </Text>
                    <Text size="2" weight="medium">
                      {expense.amountInOriginCurrency?.toFixed(2)}
                    </Text>
                  </div>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className={s.actionsSection}>
            <Button variant="outline" size="2" onClick={handleEditExpense}>
              <Pencil1Icon />
              Edit
            </Button>
            <Popover.Root>
              <Popover.Trigger>
                <Button variant="outline" size="2" color="red">
                  <TrashIcon />
                  Delete
                </Button>
              </Popover.Trigger>
              <Popover.Content>
                <Text as="p" size="2">
                  Delete expense "{expense.title}"?
                </Text>
                <Text as="p" size="2" color={dangerToken}>
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
                    onClick={handleDeleteExpense}
                  >
                    Delete
                  </Button>
                </Flex>
              </Popover.Content>
            </Popover.Root>
          </div>
        </div>
      )}
    </Inset>
  );
}
