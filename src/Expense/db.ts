import { id } from '@instantdb/core';
import type { DbTrip } from '../Trip/db';
import { db } from '../data/db';

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
  trip?: DbTrip | undefined;
};

export async function dbAddExpense(
  newExpense: Omit<DbExpense, 'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  { tripId }: { tripId: string },
) {
  const newId = id();
  return {
    id: newId,
    result: await db.transact([
      db.tx.expense[newId]
        .update({
          ...newExpense,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          trip: tripId,
        }),
    ]),
  };
}
export async function dbUpdateExpense(
  expense: Omit<DbExpense, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return db.transact(
    db.tx.expense[expense.id].merge({
      ...expense,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbDeleteExpense({
  expenseId,
  tripId,
}: {
  expenseId: string;
  tripId: string;
}) {
  return db.transact([
    db.tx.trip[tripId].unlink({
      expense: [expenseId],
    }),
    db.tx.expense[expenseId].delete(),
  ]);
}
