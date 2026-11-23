import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@radix-ui/react-collapsible';
import {
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
import { memo, useCallback, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CommentGroupWithForm } from '../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../Comment/db';
import { RenderContent } from '../common/RenderContent';
import { dangerToken } from '../common/ui';
import { useBoundStore, useDeepBoundStore } from '../data/store';
import { PersonLabel } from '../Trip/people/TripPeopleDialog';
import type { TripPerson } from '../Trip/people/types';
import { canModifyTripContent } from '../Trip/permissions';
import { useTrip } from '../Trip/store/hooks';
import type { TripSliceExpense } from '../Trip/store/types';
import { formatCurrencyAmount } from './currency';
import { dbDeleteExpense } from './db';
import s from './ExpenseCard.module.css';
import { ExpenseInlineCardForm } from './ExpenseInlineCardForm';
import { ExpenseMode } from './ExpenseMode';
import { formatMinor } from './ledger';
import { formatTimestampToReadableDate } from './time';

const noop = () => {};

export const ExpenseCard = memo(function ExpenseCard({
  expense,
  peopleById,
}: {
  expense: TripSliceExpense;
  peopleById: ReadonlyMap<string, TripPerson>;
}) {
  const [expenseMode, setExpenseMode] = useState(ExpenseMode.View);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card size="2" key={expense.id} className={s.expenseCard}>
      {expenseMode === ExpenseMode.View ? (
        <ExpenseCardView
          expense={expense}
          peopleById={peopleById}
          setExpenseMode={setExpenseMode}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
        />
      ) : (
        <ExpenseCardEdit
          expense={expense}
          setExpenseMode={setExpenseMode}
          mode={expenseMode}
        />
      )}
    </Card>
  );
});

function ExpenseCardEdit({
  expense,
  setExpenseMode,
  mode,
}: {
  expense: TripSliceExpense;
  mode: ExpenseMode;
  setExpenseMode: (mode: ExpenseMode) => void;
}) {
  const { trip } = useTrip(expense.tripId);
  return trip ? (
    <ExpenseInlineCardForm
      expense={mode === ExpenseMode.Edit ? expense : undefined}
      refundOf={mode === ExpenseMode.Add ? expense : undefined}
      trip={trip}
      expenseMode={mode}
      setExpenseMode={setExpenseMode}
    />
  ) : null;
}

function ExpenseCardView({
  expense,
  peopleById,
  setExpenseMode,
  isExpanded,
  setIsExpanded,
}: {
  expense: TripSliceExpense;
  peopleById: ReadonlyMap<string, TripPerson>;
  setExpenseMode: (mode: ExpenseMode) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const { timeZone, originCurrency, canEdit } = useBoundStore(
    useShallow((state) => {
      const trip = state.trip[expense.tripId];
      return {
        timeZone: trip?.timeZone,
        originCurrency: trip?.originCurrency,
        canEdit: canModifyTripContent(trip),
      };
    }),
  );
  const currentHandle = useBoundStore((state) => state.currentUser?.handle);

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

  const payerNames = expense.ledger?.contributions
    ?.filter((row) => BigInt(row.amountMinor) > 0n)
    .map((row) =>
      row.participantId === 'me'
        ? currentHandle
        : peopleById.get(row.participantId)?.name,
    )
    .filter(Boolean)
    .join(', ');
  function renderDetails() {
    return (
      <div className={s.expandedContentInner}>
        {/* Actions */}
        {canEdit ? (
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
        ) : null}

        {!!expense.ledger?.allocations?.length && (
          <Flex direction="column" gap="2">
            <Heading as="h5" size="1" color="gray">
              Split
            </Heading>
            {expense.ledger.allocations.map((row) => {
              const person = peopleById.get(row.participantId);
              return (
                <Flex
                  key={row.participantId}
                  justify="between"
                  align="center"
                  gap="2"
                  wrap="wrap"
                >
                  {person ? (
                    <PersonLabel person={person} />
                  ) : (
                    <Text>Person</Text>
                  )}
                  <Text size="2">
                    {formatMinor(row.amountMinor, expense.currency)}
                  </Text>
                </Flex>
              );
            })}
          </Flex>
        )}
        {canEdit &&
          expense.ledger?.method &&
          expense.ledger.kind !== 'refund' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseMode(ExpenseMode.Add)}
            >
              Record refund
            </Button>
          )}
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
                Amount in {expense.currency}:
              </Text>
              <Flex align="center" gap="1">
                <Text size="2">
                  {expense.ledger?.kind === 'refund' ? '− ' : ''}
                  {formatCurrencyAmount(expense.currency, expense.amount)}
                </Text>
              </Flex>
            </div>
            <div className={s.conversionRow}>
              <Text size="2" color="gray">
                Conversion Factor{' '}
                <Tooltip
                  content={`How much does 1 unit of origin's currency${originCurrency ? ` (${originCurrency})` : ''} is worth in the entry's currency (${expense.currency}). This is equal to "Amount" divided by "Amount in Origin's Currency".`}
                >
                  <QuestionMarkCircledIcon className={s.tooltipIcon} />
                </Tooltip>{' '}
                :
              </Text>
              <Flex align="center" gap="1">
                <Text size="2">
                  {formatCurrencyAmount(
                    undefined,
                    expense.currencyConversionFactor,
                  )}
                </Text>
              </Flex>
            </div>
            <div className={s.conversionRow}>
              <Text size="2" color="gray">
                Amount in Origin's Currency
                {originCurrency ? ` (${originCurrency})` : ''}:
              </Text>
              <Text size="2" weight="medium">
                {formatCurrencyAmount(
                  originCurrency,
                  expense.amountInOriginCurrency,
                )}
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

          <ExpenseComments expense={expense} />
        </Flex>
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} asChild>
      <Inset className={s.cardContent}>
        {/* Collapsed Header - Always Visible */}
        <CollapsibleTrigger
          className={s.collapsedHeader}
          type="button"
          aria-expanded={isExpanded}
        >
          <Text size="1" color="gray" className={s.date}>
            {timeZone
              ? formatTimestampToReadableDate(
                  Temporal.Instant.fromEpochMilliseconds(
                    expense.timestampIncurred,
                  ).toZonedDateTimeISO(timeZone),
                )
              : ''}
          </Text>
          <Text size="3" weight="bold" className={s.title}>
            {expense.title}
          </Text>
          {expense.ledger && (
            <Text size="1" color="gray" className={s.paidBy}>
              {payerNames || 'Recorded payer'}{' '}
              {expense.ledger.kind === 'refund' ? 'received refund' : 'paid'}
              {expense.ledger.method
                ? ` · ${expense.ledger.shares.length} people`
                : ''}
            </Text>
          )}
          <Badge
            variant="soft"
            color="grass"
            size="1"
            className={s.currencyBadge}
          >
            {expense.currency}
          </Badge>
          <Text size="4" weight="bold">
            {expense.ledger?.kind === 'refund' ? '− ' : ''}
            {formatCurrencyAmount(expense.currency, expense.amount)}
          </Text>
          <ChevronRightIcon className={s.expandButton} />
        </CollapsibleTrigger>
        <CollapsibleContent className={s.expandedContent}>
          <RenderContent>{renderDetails}</RenderContent>
        </CollapsibleContent>
      </Inset>
    </Collapsible>
  );
}

function ExpenseComments({ expense }: { expense: TripSliceExpense }) {
  const currentUser = useDeepBoundStore((state) => state.currentUser);
  const loading = useBoundStore(
    (state) => state.getTripMeta(expense.tripId)?.loading,
  );
  return (
    <CommentGroupWithForm
      tripId={expense.tripId}
      objectId={expense.id}
      objectType={COMMENT_GROUP_OBJECT_TYPE.EXPENSE}
      user={currentUser}
      onFormFocus={noop}
      commentGroupId={expense.commentGroupId}
      isLoading={loading}
    />
  );
}
