import { id } from '@instantdb/core';
import { db } from '../data/db';
import { DbTrip } from '../Trip/db';

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
  currency: string;
  amount: number;
  currencyConversionFactor: number | undefined;
  amountInDefaultCurrency: number | undefined;
  trip: DbTrip | undefined;
};

export async function dbAddExpense(
  newExpense: Omit<DbExpense, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
  { tripId }: { tripId: string }
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
  expense: Omit<DbExpense, 'createdAt' | 'lastUpdatedAt' | 'trip'>
) {
  return db.transact(
    db.tx.expense[expense.id].merge({
      ...expense,
      lastUpdatedAt: Date.now(),
    })
  );
}
export async function dbDeleteExpense(expense: DbExpenseWithTrip) {
  return db.transact([
    db.tx.trip[expense.trip.id].unlink({
      expense: [expense.id],
    }),
    db.tx.expense[expense.id].delete(),
  ]);
}
