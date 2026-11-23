import { deleteMutation, postMutation, putMutation } from '../data/apiClient';
import { id } from '../data/id';
import {
  optimisticExpensePatch,
  optimisticExpenseRemove,
  optimisticExpenseUpsert,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbTrip } from '../Trip/db';
import type { TripSliceExpense } from '../Trip/store/types';
import type { ExpenseLedger } from './ledger';

export type DbExpenseWithTrip = Omit<DbExpense, 'trip'> & {
  trip: DbTrip;
};

export type DbExpense = {
  id: string;

  title: string;
  description: string;
  createdAt: number;
  lastUpdatedAt: number;
  /** ms. Time the transaction occurred */
  timestampIncurred: number;
  /** default: trip.currency */
  currency: string;
  amount: number;
  ledger?: ExpenseLedger | null;
  ledgerRevision?: number;
  currencyConversionFactor: number | undefined;
  /** default: trip.originCurrency */
  amountInOriginCurrency: number | undefined;
  /** default: trip.timeZone */
  timeZoneIncurred: string | null | undefined;

  trip?: DbTrip | undefined;
};

export async function dbAddExpense(
  newExpense: Omit<
    DbExpense,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip' | 'timestampIncurred'
  > & { timestampIncurred?: number },
  {
    tripId,
    expenseId,
    idempotencyKey,
  }: { tripId: string; expenseId?: string; idempotencyKey?: string },
) {
  const path = `/api/trips/${encodeURIComponent(tripId)}/expenses`;
  if (idempotencyKey !== undefined) {
    // The server assigns the same ID and default date across retries.
    const result = await postMutation<{ id: string }>(path, {
      ...newExpense,
      idempotencyKey,
    });
    return { id: result.id, result };
  }

  const newId = expenseId ?? id();
  const expense = {
    ...newExpense,
    timestampIncurred: newExpense.timestampIncurred ?? Date.now(),
    id: newId,
  };
  return optimisticRun(
    ['expense', 'trip'],
    () => {
      const now = Date.now();
      optimisticExpenseUpsert(tripId, {
        ...expense,
        createdAt: now,
        lastUpdatedAt: now,
        tripId,
        commentGroupId: undefined,
      } as TripSliceExpense);
    },
    async () => {
      const result = await postMutation<{ id: string }>(path, expense);
      return { id: result.id, result };
    },
  );
}

export async function dbUpdateExpense(
  expense: Omit<DbExpense, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return optimisticRun(
    ['expense'],
    () => optimisticExpensePatch(expense.id, expense),
    () =>
      putMutation(`/api/expenses/${encodeURIComponent(expense.id)}`, {
        ...expense,
        expectedRevision: expense.ledgerRevision,
        currencyConversionFactor: expense.currencyConversionFactor ?? null,
        amountInOriginCurrency: expense.amountInOriginCurrency ?? null,
      }),
  );
}

export async function dbDeleteExpense(expenseId: string) {
  const state = useBoundStore.getState();
  const tripId = state.expense[expenseId]?.tripId;
  return optimisticRun(
    ['expense', 'trip'],
    () => {
      if (tripId) optimisticExpenseRemove(tripId, expenseId);
    },
    () =>
      deleteMutation(
        `/api/expenses/${encodeURIComponent(expenseId)}?expectedRevision=${state.expense[expenseId]?.ledgerRevision ?? 0}`,
      ),
  );
}
