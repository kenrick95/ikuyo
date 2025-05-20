import { id } from '@instantdb/core';
import type { DbAccommodation } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import { db } from '../data/db';
import type { DbUser } from '../data/types';
import type { DbExpense } from '../Expense/db';
import type { DbMacroplan } from '../Macroplan/db';
import type { DbTrip } from '../Trip/db';

export const COMMENT_GROUP_STATUS = {
  UNRESOLVED: 0,
  RESOLVED: 1,
} as const;
export type CommentGroupStatus =
  (typeof COMMENT_GROUP_STATUS)[keyof typeof COMMENT_GROUP_STATUS];

export type DbCommentGroupObjectType =
  (typeof COMMENT_GROUP_OBJECT_TYPE)[keyof typeof COMMENT_GROUP_OBJECT_TYPE];
export const COMMENT_GROUP_OBJECT_TYPE = {
  TRIP: 'trip',
  MACROPLAN: 'macroplan',
  ACTIVITY: 'activity',
  ACCOMMODATION: 'accommodation',
  EXPENSE: 'expense',
} as const;
/**
 * Comment group is a group of comments that belong to a trip
 * It can 'target' a trip, macroplan, activity, accommodation, or expense
 */
export type DbCommentGroup<ObjectType extends DbCommentGroupObjectType> = {
  id: string;
  createdAt: number;
  lastUpdatedAt: number;
  /** 0: unresolved; 1: resolved; */
  status: CommentGroupStatus | (number & {});

  comment: DbComment<ObjectType>[];
  /** all comment group must belong to a trip */
  trip: DbTrip | undefined;
  /** this is the actual link to determine the 'object' */
  object: DbCommentGroupObject<ObjectType> | undefined;
};
export type DbComment<ObjectType extends DbCommentGroupObjectType> = {
  id: string;
  content: string;
  createdAt: number;
  lastUpdatedAt: number;

  group: DbCommentGroup<ObjectType> | undefined;
  user: DbUser | undefined;
};
export type DbCommentGroupObject<ObjectType extends DbCommentGroupObjectType> =
  {
    /** same id as DbCommentGroup */
    id: string;
    type: ObjectType;
    createdAt: number;
    lastUpdatedAt: number;

    commentGroup: DbCommentGroup<ObjectType> | undefined;

    trip: Array<ObjectType extends 'trip' ? DbTrip : undefined>;
    macroplan: Array<ObjectType extends 'macroplan' ? DbMacroplan : undefined>;
    activity: Array<ObjectType extends 'activity' ? DbActivity : undefined>;
    accommodation: Array<
      ObjectType extends 'accommodation' ? DbAccommodation : undefined
    >;
    expense: Array<ObjectType extends 'expense' ? DbExpense : undefined>;
  };

export async function dbAddComment<ObjectType extends DbCommentGroupObjectType>(
  newComment: Omit<
    DbComment<ObjectType>,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'group' | 'user'
  >,
  {
    userId,
    tripId,
    objectId,
    objectType,
    groupId: commentGroupId,
  }: {
    userId: string;
    tripId: string;
    objectId: string;
    objectType: ObjectType;
    groupId?: string;
  },
) {
  console.log('dbAddComment', {
    newComment,
    userId,
    tripId,
    objectId,
    objectType,
    commentGroupId,
  });
  const transactions = [];
  const now = Date.now();
  if (!commentGroupId) {
    commentGroupId = id();
    transactions.push(
      db.tx.commentGroup[commentGroupId]
        .update({
          status: 0,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          trip: tripId,
          object: commentGroupId,
        }),
      db.tx.commentGroupObject[commentGroupId]
        .update({
          type: objectType,
          createdAt: now,
          lastUpdatedAt: now,
        })
        .link({
          commentGroup: commentGroupId,
          [objectType]: objectId,
        }),
    );
  }
  const newCommentId = id();
  transactions.push(
    db.tx.comment[newCommentId]
      .update({
        ...newComment,
        createdAt: now,
        lastUpdatedAt: now,
      })
      .link({
        group: commentGroupId,
        user: userId,
      }),
  );

  const result = await db.transact(transactions);

  return {
    id: newCommentId,
    result: result,
  };
}

export async function dbUpdateCommentGroupStatus(
  commentGroupId: string,
  status: CommentGroupStatus,
) {
  const now = Date.now();
  return db.transact(
    db.tx.commentGroup[commentGroupId].merge({
      status,
      lastUpdatedAt: now,
    }),
  );
}

export async function dbUpdateComment<
  ObjectType extends DbCommentGroupObjectType,
>(
  comment: Omit<
    DbComment<ObjectType>,
    'createdAt' | 'lastUpdatedAt' | 'group' | 'user'
  >,
) {
  const now = Date.now();
  const transactions = [
    db.tx.comment[comment.id].merge({
      ...comment,
      lastUpdatedAt: now,
    }),
  ];

  return db.transact(transactions);
}

export async function dbDeleteComment(
  commentId: string,
  commentGroupId: string,
) {
  if (!commentGroupId) {
    throw new Error('Comment group id is required to delete comment');
  }
  const transactions = [
    db.tx.commentGroup[commentGroupId].unlink({
      comment: [commentId],
    }),
    db.tx.comment[commentId].delete(),
  ];
  await db.transact(transactions);

  //  if the group is empty, delete the group too
  const res = await db.queryOnce({
    commentGroup: {
      comment: {},
      $: {
        where: {
          id: commentGroupId,
        },
      },
    },
  });

  const secondTransactions = [];
  if (res.data.commentGroup.length > 0) {
    const cg = res.data.commentGroup[0];
    if (cg.comment.length === 0) {
      secondTransactions.push(
        db.tx.commentGroup[commentGroupId].delete(),
        db.tx.commentGroupObject[commentGroupId].delete(),
      );
    }
  }

  return db.transact(secondTransactions);
}
