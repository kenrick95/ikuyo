import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceComment,
  TripSliceCommentGroup,
  TripSliceExpense,
  TripSliceMacroplan,
  TripSliceTask,
  TripSliceTaskList,
  TripSliceTrip,
} from '../Trip/store/types';
import { type BoundStoreType, useBoundStore } from './store';

/**
 * Optimistic update helpers for the backend-reads path.
 *
 * Apply the expected change to the local normalized store *before* sending the
 * mutation (so the UI is instantly consistent), run the request, and roll the
 * affected slices back if it fails. Non-viewed trips are reconciled by the
 * normal refresh/sync afterwards.
 */

const ENTITY_SLICES = [
  'trip',
  'activity',
  'accommodation',
  'macroplan',
  'expense',
  'taskList',
  'task',
  'commentGroup',
  'comment',
  'commentUser',
  'tripUser',
] as const;
type SliceKey = (typeof ENTITY_SLICES)[number];

type EntitySlice =
  | 'activity'
  | 'accommodation'
  | 'macroplan'
  | 'expense'
  | 'taskList'
  | 'task'
  | 'commentGroup'
  | 'comment';

/**
 * Snapshot the given slices, apply `change`, then run `request`. On rejection
 * the snapshot is restored before re-throwing.
 */
export async function optimisticRun<T>(
  keys: SliceKey[],
  change: () => void,
  request: () => Promise<T>,
): Promise<T> {
  const state = useBoundStore.getState();
  const snap = Object.fromEntries(keys.map((k) => [k, state[k]])) as Pick<
    BoundStoreType,
    SliceKey
  >;
  change();
  try {
    return await request();
  } catch (error) {
    useBoundStore.setState({ ...snap });
    throw error;
  }
}

/** Patch the currently-viewed trip's fields (title, sharing, sections, dates). */
export function optimisticPatchTrip(
  tripId: string,
  patch: Partial<TripSliceTrip>,
): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  if (!trip) return;
  useBoundStore.setState({
    trip: { ...state.trip, [tripId]: { ...trip, ...patch } },
  });
}

/** Remove a trip from the store together with all its child slices. */
export function optimisticRemoveTrip(tripId: string): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  if (!trip) return;

  const tripNext = { ...state.trip };
  delete tripNext[tripId];

  const drop = <
    TKey extends
      | 'activity'
      | 'accommodation'
      | 'macroplan'
      | 'expense'
      | 'taskList'
      | 'commentGroup'
      | 'tripUser',
  >(
    key: TKey,
    ids: string[],
  ) => {
    const set = new Set(ids);
    const map = { ...state[key] };
    for (const id of Object.keys(map)) {
      if (set.has(id)) delete map[id];
    }
    return { [key]: map };
  };

  // Tasks live under their task list, comments under their comment group.
  const taskIds = new Set(
    trip.taskListIds.flatMap((id) => state.taskList[id]?.taskIds ?? []),
  );
  const taskNext = { ...state.task };
  for (const id of taskIds) delete taskNext[id];
  const commentIds = new Set(
    trip.commentGroupIds.flatMap(
      (id) => state.commentGroup[id]?.commentIds ?? [],
    ),
  );
  const commentNext = { ...state.comment };
  for (const id of commentIds) delete commentNext[id];

  useBoundStore.setState({
    trip: tripNext,
    ...drop('activity', trip.activityIds),
    ...drop('accommodation', trip.accommodationIds),
    ...drop('macroplan', trip.macroplanIds),
    ...drop('expense', trip.expenseIds),
    ...drop('taskList', trip.taskListIds),
    ...drop('commentGroup', trip.commentGroupIds),
    ...drop('tripUser', trip.tripUserIds),
    task: taskNext,
    comment: commentNext,
  } as Pick<BoundStoreType, SliceKey>);
}

/** Insert (or patch) an entity in its slice map, adding its id to the trip list. */
export function optimisticUpsertEntity<
  T extends { id: string },
  IdListKey extends
    | 'activityIds'
    | 'accommodationIds'
    | 'macroplanIds'
    | 'expenseIds',
>(slice: EntitySlice, tripId: string, idListKey: IdListKey, entity: T): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  if (!trip) return;
  const ids = trip[idListKey];
  useBoundStore.setState({
    [slice]: { ...state[slice], [entity.id]: entity },
    trip: {
      ...state.trip,
      [tripId]: {
        ...trip,
        [idListKey]: ids.includes(entity.id) ? ids : [...ids, entity.id],
      },
    },
  } as Partial<BoundStoreType>);
}

/** Remove an entity from its slice map and the trip id-list. */
export function optimisticRemoveEntity<
  IdListKey extends
    | 'activityIds'
    | 'accommodationIds'
    | 'macroplanIds'
    | 'expenseIds',
>(slice: EntitySlice, tripId: string, idListKey: IdListKey, id: string): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  if (!trip) return;
  const next = { ...state[slice] };
  delete next[id];
  useBoundStore.setState({
    [slice]: next,
    trip: {
      ...state.trip,
      [tripId]: {
        ...trip,
        [idListKey]: trip[idListKey].filter((e) => e !== id),
      },
    },
  } as Partial<BoundStoreType>);
}

/** Patch a single entity (already present) inside a slice map. */
export function optimisticPatchEntity<T extends { id: string }>(
  slice: EntitySlice,
  id: string,
  patch: Partial<T>,
): void {
  const state = useBoundStore.getState();
  const map = { ...(state[slice] as unknown as Record<string, T>) };
  const existing = map[id];
  if (!existing) return;
  map[id] = { ...existing, ...patch };
  useBoundStore.setState({
    [slice]: map,
  } as unknown as Partial<BoundStoreType>);
}

/** Convenience wrappers so callers stay terse. */
export const optimisticActivityUpsert = (
  tripId: string,
  activity: TripSliceActivity,
) => optimisticUpsertEntity('activity', tripId, 'activityIds', activity);
export const optimisticActivityRemove = (tripId: string, id: string) =>
  optimisticRemoveEntity('activity', tripId, 'activityIds', id);
export const optimisticActivityPatch = (
  id: string,
  patch: Partial<TripSliceActivity>,
) => optimisticPatchEntity<TripSliceActivity>('activity', id, patch);

export const optimisticAccommodationUpsert = (
  tripId: string,
  accommodation: TripSliceAccommodation,
) =>
  optimisticUpsertEntity(
    'accommodation',
    tripId,
    'accommodationIds',
    accommodation,
  );
export const optimisticAccommodationRemove = (tripId: string, id: string) =>
  optimisticRemoveEntity('accommodation', tripId, 'accommodationIds', id);
export const optimisticAccommodationPatch = (
  id: string,
  patch: Partial<TripSliceAccommodation>,
) => optimisticPatchEntity<TripSliceAccommodation>('accommodation', id, patch);

export const optimisticMacroplanUpsert = (
  tripId: string,
  macroplan: TripSliceMacroplan,
) => optimisticUpsertEntity('macroplan', tripId, 'macroplanIds', macroplan);
export const optimisticMacroplanRemove = (tripId: string, id: string) =>
  optimisticRemoveEntity('macroplan', tripId, 'macroplanIds', id);
export const optimisticMacroplanPatch = (
  id: string,
  patch: Partial<TripSliceMacroplan>,
) => optimisticPatchEntity<TripSliceMacroplan>('macroplan', id, patch);

export const optimisticExpenseUpsert = (
  tripId: string,
  expense: TripSliceExpense,
) => optimisticUpsertEntity('expense', tripId, 'expenseIds', expense);
export const optimisticExpenseRemove = (tripId: string, id: string) =>
  optimisticRemoveEntity('expense', tripId, 'expenseIds', id);
export const optimisticExpensePatch = (
  id: string,
  patch: Partial<TripSliceExpense>,
) => optimisticPatchEntity<TripSliceExpense>('expense', id, patch);

/** Tasks live under a task list; patch the task + keep list.taskIds in sync. */
export function optimisticTaskUpsert(
  taskListId: string,
  task: TripSliceTask,
): void {
  const state = useBoundStore.getState();
  const list = state.taskList[taskListId];
  useBoundStore.setState({
    task: { ...state.task, [task.id]: task },
    taskList: list
      ? {
          ...state.taskList,
          [taskListId]: {
            ...list,
            taskIds: list.taskIds.includes(task.id)
              ? list.taskIds
              : [...list.taskIds, task.id],
          },
        }
      : state.taskList,
  });
}

export function optimisticTaskRemove(taskListId: string, id: string): void {
  const state = useBoundStore.getState();
  const list = state.taskList[taskListId];
  const next = { ...state.task };
  delete next[id];
  useBoundStore.setState({
    task: next,
    taskList: list
      ? {
          ...state.taskList,
          [taskListId]: {
            ...list,
            taskIds: list.taskIds.filter((t) => t !== id),
          },
        }
      : state.taskList,
  });
}

export const optimisticTaskPatch = (
  id: string,
  patch: Partial<TripSliceTask>,
) => optimisticPatchEntity<TripSliceTask>('task', id, patch);

export function optimisticTaskListUpsert(
  tripId: string,
  taskList: TripSliceTaskList,
): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  if (!trip) return;
  useBoundStore.setState({
    taskList: { ...state.taskList, [taskList.id]: taskList },
    trip: {
      ...state.trip,
      [tripId]: {
        ...trip,
        taskListIds: trip.taskListIds.includes(taskList.id)
          ? trip.taskListIds
          : [...trip.taskListIds, taskList.id],
      },
    },
  });
}

export function optimisticTaskListRemove(tripId: string, id: string): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  const next = { ...state.taskList };
  delete next[id];
  useBoundStore.setState({
    taskList: next,
    trip: trip
      ? {
          ...state.trip,
          [tripId]: {
            ...trip,
            taskListIds: trip.taskListIds.filter((t) => t !== id),
          },
        }
      : state.trip,
  });
}

export const optimisticTaskListPatch = (
  id: string,
  patch: Partial<TripSliceTaskList>,
) => optimisticPatchEntity<TripSliceTaskList>('taskList', id, patch);

/** Comments belong to a comment group (which belongs to the trip). */
export function optimisticCommentUpsert(
  commentGroupId: string,
  comment: TripSliceComment,
  user: { id: string; handle: string; activated: boolean },
): void {
  const state = useBoundStore.getState();
  const group = state.commentGroup[commentGroupId];
  useBoundStore.setState({
    comment: { ...state.comment, [comment.id]: comment },
    commentUser: { ...state.commentUser, [user.id]: user },
    commentGroup: group
      ? {
          ...state.commentGroup,
          [commentGroupId]: {
            ...group,
            commentIds: group.commentIds.includes(comment.id)
              ? group.commentIds
              : [...group.commentIds, comment.id],
          },
        }
      : state.commentGroup,
  });
}

export function optimisticCommentUpsertWithGroup(
  tripId: string,
  group: TripSliceCommentGroup,
  comment: TripSliceComment,
  user: { id: string; handle: string; activated: boolean },
): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  useBoundStore.setState({
    commentGroup: { ...state.commentGroup, [group.id]: group },
    comment: { ...state.comment, [comment.id]: comment },
    commentUser: { ...state.commentUser, [user.id]: user },
    trip: trip
      ? {
          ...state.trip,
          [tripId]: {
            ...trip,
            commentGroupIds: trip.commentGroupIds.includes(group.id)
              ? trip.commentGroupIds
              : [...trip.commentGroupIds, group.id],
          },
        }
      : state.trip,
  });
}

export function optimisticCommentRemove(
  commentGroupId: string,
  id: string,
): void {
  const state = useBoundStore.getState();
  const group = state.commentGroup[commentGroupId];
  const next = { ...state.comment };
  delete next[id];
  useBoundStore.setState({
    comment: next,
    commentGroup: group
      ? {
          ...state.commentGroup,
          [commentGroupId]: {
            ...group,
            commentIds: group.commentIds.filter((c) => c !== id),
          },
        }
      : state.commentGroup,
  });
}

export function optimisticCommentGroupRemove(
  tripId: string,
  groupId: string,
): void {
  const state = useBoundStore.getState();
  const trip = state.trip[tripId];
  const next = { ...state.commentGroup };
  delete next[groupId];
  useBoundStore.setState({
    commentGroup: next,
    trip: trip
      ? {
          ...state.trip,
          [tripId]: {
            ...trip,
            commentGroupIds: trip.commentGroupIds.filter((g) => g !== groupId),
          },
        }
      : state.trip,
  });
}

export const optimisticCommentPatch = (
  id: string,
  patch: Partial<TripSliceComment>,
) => optimisticPatchEntity<TripSliceComment>('comment', id, patch);

export const optimisticCommentGroupPatch = (
  id: string,
  patch: Partial<TripSliceCommentGroup>,
) => optimisticPatchEntity<TripSliceCommentGroup>('commentGroup', id, patch);

export type { SliceKey };
