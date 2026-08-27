import {
  COMMENT_GROUP_OBJECT_TYPE,
  type DbCommentGroupObjectType,
  dbAddComment,
  dbUpdateComment,
  dbUpdateCommentGroupStatus,
} from '../Comment/db';
import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import { asOptStr, asStr, str, strEnum } from './schema';

const OBJECT_TYPES = Object.values(COMMENT_GROUP_OBJECT_TYPE);

export function createCommentTools(): WebMCPTool[] {
  return [
    {
      name: 'comment-list',
      description:
        'Lists all comments (grouped by object) for a trip from the locally loaded state.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
        },
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        const states = useBoundStore.getState();
        const groups = Object.values(states.commentGroup).filter(
          (g) => g.tripId === tripId,
        );
        const comments = groups.map((g) => ({
          commentGroupId: g.id,
          objectType: g.objectType,
          objectId: g.objectId,
          status: g.status,
          comments: g.commentIds.map((cid) => {
            const c = states.comment[cid];
            return c
              ? { id: c.id, content: c.content, userId: c.userId }
              : null;
          }),
        }));
        return { ok: true, tripId, groups: comments };
      },
    },
    {
      name: 'comment-add',
      description:
        'Adds a comment to an object within a trip. objectType is one of trip, activity, accommodation, macroplan, expense, task; objectId is that object’s id.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          idempotencyKey: idempotencyKeySchema(),
          content: str('Comment text.'),
          objectType: strEnum(
            'The type of object being commented on.',
            OBJECT_TYPES,
          ),
          objectId: str(
            'The id of the object (trip/activity/etc.) to comment on.',
          ),
          groupId: str(
            'Optional existing comment-group id from comment-list. Provide it to reply in that thread.',
          ),
        },
        required: ['content', 'objectType', 'objectId'],
      },
      async execute(input) {
        assertWritable('adding a comment');
        const user = requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const objectType = asStr(
          input.objectType,
          'objectType',
        ) as DbCommentGroupObjectType;
        if (!OBJECT_TYPES.includes(objectType)) {
          throw new Error(
            `objectType must be one of ${OBJECT_TYPES.join(', ')}`,
          );
        }
        const objectId = asStr(input.objectId, 'objectId');
        const groupId = asOptStr(input.groupId, 'groupId') ?? undefined;
        if (groupId) {
          const group = useBoundStore.getState().commentGroup[groupId];
          if (
            !group ||
            group.tripId !== tripId ||
            group.objectType !== objectType ||
            group.objectId !== objectId
          ) {
            throw new Error(
              'groupId must identify a loaded comment thread for the supplied trip and object.',
            );
          }
        }
        const content = asStr(input.content, 'content');
        return runIdempotent(
          'comment-add',
          `${tripId}:${objectType}:${objectId}`,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddComment(
              { content },
              { userId: user.id, tripId, objectId, objectType, groupId },
            );
            return { ok: true, commentId: result.id };
          },
        );
      },
    },
    {
      name: 'comment-update',
      description: 'Edits the text of an existing comment.',
      inputSchema: {
        type: 'object',
        properties: {
          commentId: str('The comment id.'),
          content: str('New comment text.'),
        },
        required: ['commentId', 'content'],
      },
      async execute(input) {
        assertWritable('updating a comment');
        requireAuthUser();
        const id = asStr(input.commentId, 'commentId');
        await dbUpdateComment({
          id,
          content: asStr(input.content, 'content'),
        });
        return { ok: true, commentId: id };
      },
    },
    {
      name: 'comment-resolve',
      description:
        'Marks a comment group (thread) as resolved (1) or unresolved (0).',
      inputSchema: {
        type: 'object',
        properties: {
          commentGroupId: str('The comment group id (from comment-list).'),
          resolved: strEnum('true to mark resolved, false to reopen.', [
            'true',
            'false',
          ]),
        },
        required: ['commentGroupId', 'resolved'],
      },
      async execute(input) {
        assertWritable('changing comment status');
        requireAuthUser();
        const groupId = asStr(input.commentGroupId, 'commentGroupId');
        const resolved = input.resolved === 'true';
        await dbUpdateCommentGroupStatus(groupId, resolved ? 1 : 0);
        return { ok: true, commentGroupId: groupId, resolved };
      },
    },
  ];
}
