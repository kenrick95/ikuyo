import { id } from '@instantdb/core';
import { deleteMutation, postMutation, putMutation } from '../data/apiClient';
import { backendContentWrites } from '../data/backendConfig';
import { db } from '../data/db';
import {
  optimisticMacroplanPatch,
  optimisticMacroplanRemove,
  optimisticMacroplanUpsert,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbTrip, DbTripWithMacroplan } from '../Trip/db';
import type { TripSliceMacroplan } from '../Trip/store/types';

export type DbMacroplanWithTrip = Omit<DbMacroplan, 'trip'> & {
  trip: DbTripWithMacroplan;
};

/**
 * Macroplan is a rough plan for the trip,
 * that can span across days, or only for a single day
 * Allow overlaps too.
 * Displays as additional row like accomodation in timetable.
 *
 * Use case:
 * - in a long trip, I want to plan the trips with several different major locations; so using Macroplan will help break down the whole trip into smaller parts
 *
 * Convention: The "p" in "Macroplan" is not capitalized
 */
export type DbMacroplan = {
  id: string;
  name: string;
  notes: string;

  /** ms */
  timestampStart: number;
  /** ms of day _after_ of macroplan end. This means the final full day of macroplan is one day before `timestampEnd` */
  timestampEnd: number;

  /** default: trip.timeZone */
  timeZoneStart: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneEnd: string | null | undefined;

  /** ms */
  createdAt: number;

  /** ms */
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
};

export async function dbAddMacroplan(
  newMacroplan: Omit<
    DbMacroplan,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'
  >,
  { tripId }: { tripId: string },
) {
  if (backendContentWrites) {
    const newId = id();
    return optimisticRun(
      ['macroplan', 'trip'],
      () => {
        const now = Date.now();
        optimisticMacroplanUpsert(tripId, {
          ...newMacroplan,
          id: newId,
          createdAt: now,
          lastUpdatedAt: now,
          tripId,
          commentGroupId: undefined,
        } as TripSliceMacroplan);
      },
      async () => {
        const result = await postMutation<{ id: string }>(
          `/api/trips/${encodeURIComponent(tripId)}/macroplans`,
          { ...newMacroplan, id: newId },
        );
        return {
          id: result.id,
          transaction: result,
          undo: async () =>
            deleteMutation(`/api/macroplans/${encodeURIComponent(result.id)}`),
        };
      },
    );
  }
  const newMacroplanId = id();
  const transaction = await db.transact([
    db.tx.macroplan[newMacroplanId]
      .update({
        ...newMacroplan,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
      })
      .link({
        trip: tripId,
      }),
  ]);
  return {
    id: newMacroplanId,
    transaction,
    undo: async () => {
      return await db.transact(db.tx.macroplan[newMacroplanId].delete());
    },
  };
}

export async function dbUpdateMacroplan(
  macroplan: Omit<DbMacroplan, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  if (backendContentWrites) {
    return optimisticRun(
      ['macroplan'],
      () => optimisticMacroplanPatch(macroplan.id, macroplan),
      async () => {
        const result = await putMutation<DbMacroplan>(
          `/api/macroplans/${encodeURIComponent(macroplan.id)}`,
          macroplan,
        );
        return { transaction: result, undo: async () => undefined };
      },
    );
  }
  const snapshot = await db.queryOnce({
    macroplan: {
      $: {
        where: { id: macroplan.id },
      },
    },
  });
  const transaction = await db.transact(
    db.tx.macroplan[macroplan.id].merge({
      ...macroplan,
      lastUpdatedAt: Date.now(),
    }),
  );
  return {
    transaction,
    undo: async () => {
      return await db.transact(
        db.tx.macroplan[macroplan.id].merge({
          ...snapshot.data.macroplan[0],
          lastUpdatedAt: Date.now(),
        }),
      );
    },
  };
}

export async function dbDeleteMacroplan(macroplanId: string) {
  if (backendContentWrites) {
    const state = useBoundStore.getState();
    const tripId = state.macroplan[macroplanId]?.tripId;
    return optimisticRun(
      ['macroplan', 'trip'],
      () => {
        if (tripId) optimisticMacroplanRemove(tripId, macroplanId);
      },
      () =>
        deleteMutation(`/api/macroplans/${encodeURIComponent(macroplanId)}`),
    );
  }
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'macroplan',
          'object.macroplan.id': macroplanId,
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

  // TODO: change to soft delete so we can easily undo
  return db.transact([
    ...commentGroupIds.map((commentGroupId) =>
      db.tx.commentGroup[commentGroupId].delete(),
    ),
    ...commentGroupIds.map((commentGroupId) =>
      // CommentGroupObject has same id as commentGroup
      db.tx.commentGroupObject[commentGroupId].delete(),
    ),
    ...commentIds.map((commentId) => db.tx.comment[commentId].delete()),
    db.tx.macroplan[macroplanId].delete(),
  ]);
}
