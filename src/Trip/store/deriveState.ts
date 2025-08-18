import {
  COMMENT_GROUP_OBJECT_TYPE,
  type DbCommentGroupObjectType,
} from '../../Comment/db';
import type { BoundStoreType } from '../../data/store';
import { TripUserRole } from '../../User/TripUserRole';
import type { TripSharingLevelType } from '../tripSharingLevel';
import type {
  DbTripQueryReturnType,
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceComment,
  TripSliceCommentGroup,
  TripSliceCommentUser,
  TripSliceExpense,
  TripSliceMacroplan,
  TripSliceTrip,
  TripSliceTripUser,
  TripSliceTask,
  TripSliceTaskList,
} from './types';

export function deriveNewTripState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceTrip;
} {
  const currentUser = state.currentUser;
  const currentUserTripUser = trip.tripUser.find((tu) => {
    return tu.user?.[0]?.id === currentUser?.id;
  });

  const newTripState = {
    ...state.trip,
    [trip.id]: {
      id: trip.id,
      title: trip.title,
      timestampStart: trip.timestampStart,
      timestampEnd: trip.timestampEnd,
      currency: trip.currency,
      region: trip.region,
      originCurrency: trip.originCurrency,
      timeZone: trip.timeZone,
      accommodationIds: trip.accommodation.map((a) => a.id),
      activityIds: trip.activity.map((a) => a.id),
      macroplanIds: trip.macroplan.map((a) => a.id),
      tripUserIds: trip.tripUser.map((a) => a.id),
      commentGroupIds: trip.commentGroup.map((a) => a.id),
      expenseIds: trip.expense.map((a) => a.id),
      taskListIds: trip.taskList.map((a) => a.id),
      sharingLevel: trip.sharingLevel as TripSharingLevelType,
      currentUserRole:
        (currentUserTripUser?.role as TripUserRole | undefined) ??
        TripUserRole.Viewer,
    } satisfies TripSliceTrip,
  };
  return newTripState;
}
export function deriveNewAccommodationState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceAccommodation;
} {
  const newAccommodationState = { ...state.accommodation };
  for (const accommodation of trip.accommodation ?? []) {
    const commentGroup = trip.commentGroup?.find((cg) => {
      return (
        cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.ACCOMMODATION &&
        cg.object?.accommodation?.[0]?.id === accommodation.id
      );
    });
    newAccommodationState[accommodation.id] = {
      ...accommodation,
      tripId: trip.id,
      commentGroupId: commentGroup?.id ?? undefined,
      locationLat: accommodation.locationLat,
      locationLng: accommodation.locationLng,
      locationZoom: accommodation.locationZoom,
    } satisfies TripSliceAccommodation;
  }
  return newAccommodationState;
}
export function deriveNewActivityState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceActivity;
} {
  const newActivityState = { ...state.activity };
  for (const activity of trip.activity ?? []) {
    const commentGroup = trip.commentGroup?.find((cg) => {
      return (
        cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.ACTIVITY &&
        cg.object?.activity?.[0]?.id === activity.id
      );
    });
    newActivityState[activity.id] = {
      ...activity,
      tripId: trip.id,
      timestampStart: activity.timestampStart,
      timestampEnd: activity.timestampEnd,
      commentGroupId: commentGroup?.id ?? undefined,
      locationLat: activity.locationLat,
      locationLng: activity.locationLng,
      locationZoom: activity.locationZoom,
      locationDestination: activity.locationDestination,
      locationDestinationLat: activity.locationDestinationLat,
      locationDestinationLng: activity.locationDestinationLng,
      locationDestinationZoom: activity.locationDestinationZoom,
    } satisfies TripSliceActivity;
  }
  return newActivityState;
}
export function deriveNewMacroplanState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceMacroplan;
} {
  const newMacroplanState = { ...state.macroplan };
  for (const macroplan of trip.macroplan ?? []) {
    const commentGroup = trip.commentGroup?.find((cg) => {
      return (
        cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.MACROPLAN &&
        cg.object?.macroplan?.[0]?.id === macroplan.id
      );
    });
    newMacroplanState[macroplan.id] = {
      ...macroplan,
      tripId: trip.id,
      commentGroupId: commentGroup?.id ?? undefined,
    } satisfies TripSliceMacroplan;
  }
  return newMacroplanState;
}
export function deriveNewCommentGroupState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceCommentGroup;
} {
  const newCommentGroupState = { ...state.commentGroup };
  for (const commentGroup of trip.commentGroup ?? []) {
    const objectType = commentGroup.object?.type as
      | DbCommentGroupObjectType
      | undefined;
    let objectName = '';
    if (!objectType) {
      continue;
    }
    let objectId: string | undefined;
    if (objectType === COMMENT_GROUP_OBJECT_TYPE.ACTIVITY) {
      objectId = commentGroup.object?.activity?.[0]?.id;
      objectName = commentGroup.object?.activity?.[0]?.title ?? '';
    } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.ACCOMMODATION) {
      objectId = commentGroup.object?.accommodation?.[0]?.id;
      objectName = commentGroup.object?.accommodation?.[0]?.name ?? '';
    } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.MACROPLAN) {
      objectId = commentGroup.object?.macroplan?.[0]?.id;
      objectName = commentGroup.object?.macroplan?.[0]?.name ?? '';
    } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.EXPENSE) {
      objectId = commentGroup.object?.expense?.[0]?.id;
      objectName = commentGroup.object?.expense?.[0]?.title ?? '';
    } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.TRIP) {
      objectId = commentGroup.object?.trip?.[0]?.id;
      objectName = commentGroup.object?.trip?.[0]?.title ?? '';
    } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.TASK) {
      objectId = commentGroup.object?.task?.[0]?.id;
      objectName = commentGroup.object?.task?.[0]?.title ?? '';
    }
    if (!objectId) {
      continue;
    }
    newCommentGroupState[commentGroup.id] = {
      ...commentGroup,
      tripId: trip.id,
      objectType,
      objectName,
      objectId,
      commentIds: commentGroup.comment.map((c) => c.id),
    } satisfies TripSliceCommentGroup;
  }
  return newCommentGroupState;
}
export function deriveNewExpenseState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceExpense;
} {
  const newExpenseState = { ...state.expense };
  for (const expense of trip.expense ?? []) {
    const commentGroup = trip.commentGroup?.find((cg) => {
      return (
        cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.EXPENSE &&
        cg.object?.expense?.[0]?.id === expense.id
      );
    });
    newExpenseState[expense.id] = {
      ...expense,
      tripId: trip.id,
      commentGroupId: commentGroup?.id ?? undefined,
    } satisfies TripSliceExpense;
  }
  return newExpenseState;
}
export function deriveNewTripUserState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  [id: string]: TripSliceTripUser;
} {
  const newTripUserState = { ...state.tripUser };
  for (const tripUser of trip.tripUser ?? []) {
    newTripUserState[tripUser.id] = {
      id: tripUser.id,
      tripId: trip.id,
      userId: tripUser.user?.[0]?.id ?? '',
      role: tripUser.role as TripUserRole,
      activated: tripUser.user?.[0]?.activated ?? false,
      handle: tripUser.user?.[0]?.handle ?? '',
      email: tripUser.user?.[0]?.email ?? '',
    } satisfies TripSliceTripUser;
  }
  return newTripUserState;
}
export function deriveNewCommentAndCommentUserState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  newCommentState: { [id: string]: TripSliceComment };
  newCommentUserState: { [id: string]: TripSliceCommentUser };
} {
  const newCommentState = { ...state.comment };
  const newCommentUserState = { ...state.commentUser };
  for (const commentGroup of trip.commentGroup ?? []) {
    for (const comment of commentGroup.comment) {
      const commentUserId = comment.user?.id ?? '';
      newCommentState[comment.id] = {
        ...comment,
        commentGroupId: commentGroup.id,
        userId: commentUserId,
      } satisfies TripSliceComment;
      newCommentUserState[commentUserId] = {
        id: commentUserId,
        handle: comment.user?.handle ?? '',
        activated: comment.user?.activated ?? false,
      } satisfies TripSliceCommentUser;
    }
  }
  return { newCommentState, newCommentUserState };
}

export function deriveNewTripTaskListAndTaskState(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): {
  taskListState: { [id: string]: TripSliceTaskList };
  taskState: { [id: string]: TripSliceTask };
} {
  const taskListState = { ...state.taskList };
  const taskState = { ...state.task };
  for (const taskList of trip.taskList ?? []) {
    taskListState[taskList.id] = {
      ...taskList,
      tripId: trip.id,
      taskIds: taskList.task.map((t) => t.id),
    } satisfies TripSliceTaskList;
    for (const task of taskList.task) {
      taskState[task.id] = {
        ...task,
        taskListId: taskList.id,
      } satisfies TripSliceTask;
    }
  }
  return { taskListState, taskState };
}
