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
  Heading,
  Inset,
  Popover,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useState } from 'react';
import { CommentGroupWithForm } from '../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../Comment/db';
import { dangerToken } from '../common/ui';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { useTrip } from '../Trip/store/hooks';
import type { TripSliceExpense } from '../Trip/store/types';
import { dbDeleteExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseInlineCardForm } from './ExpenseInlineCardForm';
import { ExpenseMode } from './ExpenseMode';
import { formatTimestampToReadableDate } from './time';

const noop = () => {};

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
  const { trip, loading } = useTrip(expense.tripId);
  const currentUser = useDeepBoundStore((state) => state.currentUser);

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
        <Badge
          variant="soft"
          color="grass"
          size="1"
          className={s.currencyBadge}
        >
          {expense.currency}
        </Badge>
        <Text size="4" weight="bold">
          {expense.amount.toFixed(2)}
        </Text>
        {isExpanded ? (
          <ChevronDownIcon className={s.expandButton} />
        ) : (
          <ChevronRightIcon className={s.expandButton} />
        )}
      </button>

      {isExpanded && (
        <div className={s.expandedContent}>
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

          {/* Description */}
          {expense.description ? (
            <div className={s.detailSection}>
              <Heading
                as="h5"
                className={s.detailLabel}
                size="1"
                color="gray"
                weight="medium"
              >
                Description
              </Heading>
              <Text size="2" className={s.description}>
                {expense.description}
              </Text>
            </div>
          ) : null}

          {/* Currency Conversion Details */}
          <div className={s.detailSection}>
            <Heading
              as="h5"
              className={s.detailLabel}
              size="1"
              color="gray"
              weight="medium"
            >
              Currency Conversion
            </Heading>
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

          {/* Comments */}
          <Flex direction="column" gap="2">
            <Heading
              as="h5"
              className={s.detailLabel}
              size="1"
              color="gray"
              weight="medium"
            >
              Comments
            </Heading>

            <CommentGroupWithForm
              tripId={expense?.tripId}
              objectId={expense?.id}
              objectType={COMMENT_GROUP_OBJECT_TYPE.EXPENSE}
              user={currentUser}
              onFormFocus={noop}
              commentGroupId={expense?.commentGroupId}
              isLoading={loading}
            />
          </Flex>
        </div>
      )}
    </Inset>
  );
}
