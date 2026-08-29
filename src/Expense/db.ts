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
  currencyConversionFactor: number | undefined;
  /** default: trip.originCurrency */
  amountInOriginCurrency: number | undefined;
  /** default: trip.timeZone */
  timeZoneIncurred: string | null | undefined;

  trip?: DbTrip | undefined;
};

export async function dbAddExpense(
  newExpense: Omit<DbExpense, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  { tripId }: { tripId: string },
) {
  const newId = id();
  return optimisticRun(
    ['expense', 'trip'],
    () => {
      const now = Date.now();
      optimisticExpenseUpsert(tripId, {
        ...newExpense,
        id: newId,
        createdAt: now,
        lastUpdatedAt: now,
        tripId,
        commentGroupId: undefined,
      } as TripSliceExpense);
    },
    async () => {
      const result = await postMutation<{ id: string }>(
        `/api/trips/${encodeURIComponent(tripId)}/expenses`,
        { ...newExpense, id: newId },
      );
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
      putMutation(`/api/expenses/${encodeURIComponent(expense.id)}`, expense),
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
    () => deleteMutation(`/api/expenses/${encodeURIComponent(expenseId)}`),
  );
}
