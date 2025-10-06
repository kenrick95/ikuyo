import { id } from '@instantdb/core';
import { db } from '../data/db';
import type { DbTrip } from '../Trip/db';

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
export async function dbDeleteExpense(expenseId: string) {
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'expense',
          'object.expense.id': expenseId,
        },
        fields: ['id'],
      },
    },
  });
  const commentGroupIds = commentGroups.data.commentGroup.map(
    (commentGroup) => commentGroup.id,
  );
  const commentIds = commentGroups.data.commentGroup.flatMap((commentGroup) =>
    commentGroup.comment.map((comment) => comment.id),
  );

  return db.transact([
    ...commentGroupIds.map((commentGroupId) =>
      db.tx.commentGroup[commentGroupId].delete(),
    ),
    ...commentGroupIds.map((commentGroupId) =>
      // CommentGroupObject has same id as commentGroup
      db.tx.commentGroupObject[commentGroupId].delete(),
    ),
    ...commentIds.map((commentId) => db.tx.comment[commentId].delete()),
    db.tx.expense[expenseId].delete(),
  ]);
}
