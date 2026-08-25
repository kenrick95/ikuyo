import type { DbAccommodation } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import {
  deleteMutation,
  patchMutation,
  postMutation,
  putMutation,
} from '../data/apiClient';
import { id } from '../data/id';
import {
  optimisticCommentGroupPatch,
  optimisticCommentGroupRemove,
  optimisticCommentPatch,
  optimisticCommentRemove,
  optimisticCommentUpsert,
  optimisticCommentUpsertWithGroup,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import type { DbExpense } from '../Expense/db';
import type { DbMacroplan } from '../Macroplan/db';
import type { DbTask } from '../Task/db';
import type { DbTrip } from '../Trip/db';
import type {
  TripSliceComment,
  TripSliceCommentGroup,
} from '../Trip/store/types';

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
  TASK: 'task',
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
    task: Array<ObjectType extends 'task' ? DbTask : undefined>;
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
  // Optimistic: comment (and a new comment group when this is the first comment
  // on the object) appear locally before the request resolves; the ids are
  // client-supplied so the server persists the exact same group/comment ids.
  const newCommentId = id();
  const newGroupId = commentGroupId ?? id();
  const now = Date.now();
  const user = useBoundStore.getState().currentUser;
  const commentUser = {
    id: userId,
    handle: user?.handle ?? '',
    activated: true,
  };
  const comment: TripSliceComment = {
    id: newCommentId,
    content: newComment.content,
    createdAt: now,
    lastUpdatedAt: now,
    commentGroupId: newGroupId,
    userId,
  };
  return optimisticRun(
    ['commentGroup', 'comment', 'commentUser', 'trip'],
    () => {
      if (commentGroupId) {
        optimisticCommentUpsert(newGroupId, comment, commentUser);
      } else {
        optimisticCommentUpsertWithGroup(
          tripId,
          {
            id: newGroupId,
            createdAt: now,
            lastUpdatedAt: now,
            status: 0,
            tripId,
            objectType,
            objectId,
            objectName: '',
            commentIds: [newCommentId],
          } as TripSliceCommentGroup,
          comment,
          commentUser,
        );
      }
    },
    async () => {
      const result = await postMutation<{ id: string; result: unknown }>(
        `/api/trips/${encodeURIComponent(tripId)}/comment-groups`,
        {
          content: newComment.content,
          objectType: objectTypeNumber(objectType),
          objectId,
          groupId: newGroupId,
          id: newCommentId,
        },
      );
      return result;
    },
  );
}

function objectTypeNumber(type: DbCommentGroupObjectType): number {
  return {
    trip: 0,
    activity: 1,
    accommodation: 2,
    macroplan: 3,
    expense: 4,
    task: 5,
  }[type];
}

export async function dbUpdateCommentGroupStatus(
  commentGroupId: string,
  status: CommentGroupStatus,
) {
  return optimisticRun(
    ['commentGroup'],
    () => optimisticCommentGroupPatch(commentGroupId, { status }),
    () =>
      patchMutation(
        `/api/comment-groups/${encodeURIComponent(commentGroupId)}/status`,
        { status },
      ),
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
  return optimisticRun(
    ['comment'],
    () =>
      optimisticCommentPatch(comment.id, {
        content: comment.content,
        lastUpdatedAt: Date.now(),
      }),
    () =>
      putMutation(`/api/comments/${encodeURIComponent(comment.id)}`, {
        content: comment.content,
      }),
  );
}

export async function dbDeleteComment(
  commentId: string,
  commentGroupId: string,
) {
  if (!commentGroupId) {
    throw new Error('Comment group id is required to delete comment');
  }
  const state = useBoundStore.getState();
  const commentGroup = state.commentGroup[commentGroupId];
  return optimisticRun(
    ['commentGroup', 'comment', 'trip'],
    () => {
      optimisticCommentRemove(commentGroupId, commentId);
      // If the group becomes empty, drop it from the trip too (matches the
      // server's delete-comment workflow).
      if (commentGroup && commentGroup.commentIds.length <= 1) {
        optimisticCommentGroupRemove(commentGroup.tripId, commentGroupId);
      }
    },
    () => deleteMutation(`/api/comments/${encodeURIComponent(commentId)}`),
  );
}
