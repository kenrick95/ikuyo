import type { StateCreator } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { DbAccommodationWithTrip } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import {
  COMMENT_GROUP_OBJECT_TYPE,
  type DbCommentGroupObjectType,
} from '../Comment/db';
import { db } from '../data/db';
import { type BoundStoreType, useBoundStore } from '../data/store';
import type { TripUserRole } from '../data/TripUserRole';
import type { DbExpense } from '../Expense/db';
import type { DbMacroplanWithTrip } from '../Macroplan/db';
import type { DbTrip } from './db';
export type TripSliceTrip = Omit<
  DbTrip,
  'accommodation' | 'activity' | 'macroplan' | 'tripUser' | 'commentGroup'
> & {
  accommodationIds: string[];
  activityIds: string[];
  macroplanIds: string[];
  tripUserIds: string[];
  commentGroupIds: string[];
  expenseIds: string[];
};
export type TripSliceActivity = Omit<DbActivity, 'trip' | 'commentGroup'> & {
  tripId: string;
  commentGroupId: string | undefined;
};
export type TripSliceAccommodation = Omit<
  DbAccommodationWithTrip,
  'trip' | 'commentGroup'
> & {
  tripId: string;
  commentGroupId: string | undefined;
};
export type TripSliceMacroplan = Omit<
  DbMacroplanWithTrip,
  'trip' | 'commentGroup'
> & {
  tripId: string;
  commentGroupId: string | undefined;
};
export type TripSliceCommentGroup = {
  id: string;
  createdAt: number;
  lastUpdatedAt: number;
  /** 0: unresolved; 1: resolved; */
  status: number;

  tripId: string;
  objectType: DbCommentGroupObjectType;
  objectId: string;
  objectName: string;

  commentIds: string[];
};
export type TripSliceComment = {
  id: string;
  content: string;
  createdAt: number;
  lastUpdatedAt: number;
  commentGroupId: string;
  userId: string;
};
export type TripSliceCommentUser = {
  id: string;
  handle: string;
  activated: boolean;
};
export type TripSliceCommentWithUser = TripSliceComment & {
  user: TripSliceCommentUser;
};
export type TripSliceExpense = Omit<DbExpense, 'trip' | 'commentGroup'> & {
  tripId: string;
  commentGroupId: string | undefined;
};
export type TripSliceTripUser = {
  id: string;
  tripId: string;
  userId: string;
  role: TripUserRole;
  activated: boolean;
  handle: string;
  email: string;
};

export interface TripSlice {
  trip: {
    [id: string]: TripSliceTrip;
  };
  activity: {
    [id: string]: TripSliceActivity;
  };
  accommodation: {
    [id: string]: TripSliceAccommodation;
  };
  macroplan: {
    [id: string]: TripSliceMacroplan;
  };
  expense: {
    [id: string]: TripSliceExpense;
  };
  commentGroup: {
    [id: string]: TripSliceCommentGroup;
  };
  tripUser: {
    [tripUserId: string]: TripSliceTripUser;
  };
  comment: {
    [commentId: string]: TripSliceComment;
  };
  commentUser: {
    [userId: string]: TripSliceCommentUser;
  };
  currentTripId: string | undefined;
  setCurrentTripId: (tripId: string | undefined) => void;
  getCurrentTrip: () => TripSliceTrip | undefined;

  /** return: unsubscribe function */
  subscribeTrip: (id: string) => () => void;

  getTrip: (id: string | undefined) => TripSliceTrip | undefined;
  getActivity: (id: string) => TripSliceActivity | undefined;
  getActivities: (ids: string[]) => TripSliceActivity[];
  getAccommodation: (id: string) => TripSliceAccommodation | undefined;
  getMacroplan: (id: string) => TripSliceMacroplan | undefined;
  getCommentGroup: (
    id: string | undefined,
  ) => TripSliceCommentGroup | undefined;
  getAllComments: (tripId: string | undefined) => TripSliceCommentWithUser[];
  getComments: (
    ids: string[],
  ) => Array<TripSliceComment & { user: TripSliceCommentUser }>;
  getExpense: (id: string) => TripSliceExpense | undefined;
  getExpenses: (ids: string[]) => TripSliceExpense[];

  getTripUsers: (ids: string[]) => TripSliceTripUser[];
  getAccommodations: (ids: string[]) => TripSliceAccommodation[];
  getMacroplans: (ids: string[]) => TripSliceMacroplan[];
}

export const createTripSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripSlice
> = (set, get) => {
  return {
    currentTripId: undefined,
    currentTrip: undefined,
    trip: {},
    accommodation: {},
    activity: {},
    macroplan: {},
    commentGroup: {},
    comment: {},
    commentUser: {},
    tripUser: {},
    expense: {},
    subscribeTrip: (tripId: string) => {
      return db.subscribeQuery(
        {
          trip: {
            $: {
              where: {
                id: tripId,
              },
              limit: 1,
            },
            activity: {},
            accommodation: {},
            macroplan: {},
            expense: {},
            tripUser: {
              user: {
                $: { fields: ['id', 'handle', 'activated', 'email'] },
              },
            },
            commentGroup: {
              comment: {
                user: {
                  $: { fields: ['id', 'handle', 'activated'] },
                },
              },
              object: {
                activity: { $: { fields: ['id', 'title'] } },
                accommodation: { $: { fields: ['id', 'name'] } },
                expense: { $: { fields: ['id', 'title'] } },
                trip: { $: { fields: ['id', 'title'] } },
                macroplan: { $: { fields: ['id', 'name'] } },
                $: {
                  fields: ['type', 'createdAt', 'lastUpdatedAt', 'id'],
                },
              },
            },
          },
        },
        ({ data }) => {
          const trip = data?.trip?.[0];

          if (!trip) {
            return;
          }

          set((state) => {
            const newAccommodationState = {
              ...state.accommodation,
            };
            const newActivityState = {
              ...state.activity,
            };
            const newMacroplanState = {
              ...state.macroplan,
            };
            const newCommentGroupState = {
              ...state.commentGroup,
            };
            const newTripUserState = {
              ...state.tripUser,
            };

            for (const activity of trip.activity) {
              const commentGroup = trip.commentGroup.find((cg) => {
                return (
                  cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.ACTIVITY &&
                  cg.object?.id === activity.id
                );
              });
              newActivityState[activity.id] = {
                ...activity,
                tripId: trip.id,
                commentGroupId: commentGroup?.id ?? undefined,
                locationLat: activity.locationLat,
                locationLng: activity.locationLng,
                locationZoom: activity.locationZoom,
              } satisfies TripSliceActivity;
            }
            for (const accommodation of trip.accommodation) {
              const commentGroup = trip.commentGroup.find((cg) => {
                return (
                  cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.ACCOMMODATION &&
                  cg.object?.id === accommodation.id
                );
              });
              newAccommodationState[accommodation.id] = {
                ...accommodation,
                tripId: trip.id,
                commentGroupId: commentGroup?.id ?? undefined,
              } satisfies TripSliceAccommodation;
            }
            for (const macroplan of trip.macroplan) {
              const commentGroup = trip.commentGroup.find((cg) => {
                return (
                  cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.MACROPLAN &&
                  cg.object?.id === macroplan.id
                );
              });
              newMacroplanState[macroplan.id] = {
                ...macroplan,
                tripId: trip.id,
                commentGroupId: commentGroup?.id ?? undefined,
              } satisfies TripSliceMacroplan;
            }

            for (const commentGroup of trip.commentGroup) {
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
              } else if (
                objectType === COMMENT_GROUP_OBJECT_TYPE.ACCOMMODATION
              ) {
                objectId = commentGroup.object?.accommodation?.[0]?.id;
                objectName =
                  commentGroup.object?.accommodation?.[0]?.name ?? '';
              } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.MACROPLAN) {
                objectId = commentGroup.object?.macroplan?.[0]?.id;
                objectName = commentGroup.object?.macroplan?.[0]?.name ?? '';
              } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.EXPENSE) {
                objectId = commentGroup.object?.expense?.[0]?.id;
                objectName = commentGroup.object?.expense?.[0]?.title ?? '';
              } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.TRIP) {
                objectId = commentGroup.object?.trip?.[0]?.id;
                objectName = commentGroup.object?.trip?.[0]?.title ?? '';
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
            const newExpenseState = { ...state.expense };
            for (const expense of trip.expense) {
              const commentGroup = trip.commentGroup.find((cg) => {
                return (
                  cg.object?.type === COMMENT_GROUP_OBJECT_TYPE.EXPENSE &&
                  cg.object?.id === expense.id
                );
              });
              newExpenseState[expense.id] = {
                ...expense,
                tripId: trip.id,
                commentGroupId: commentGroup?.id ?? undefined,
              } satisfies TripSliceExpense;
            }
            for (const tripUser of trip.tripUser) {
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

            const newCommentState = { ...state.comment };
            const newCommentUserState = { ...state.commentUser };
            for (const commentGroup of trip.commentGroup) {
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

            return {
              trip: {
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
                  tripUserIds: trip.tripUser.map((a) => a.user?.[0]?.id),
                  commentGroupIds: trip.commentGroup.map((a) => a.id),
                  expenseIds: trip.expense.map((a) => a.id),
                } satisfies TripSliceTrip,
              },
              accommodation: newAccommodationState,
              activity: newActivityState,
              macroplan: newMacroplanState,
              commentGroup: newCommentGroupState,
              expense: newExpenseState,
              tripUser: newTripUserState,
            } satisfies Partial<TripSlice>;
          });
        },
      );
    },
    setCurrentTripId: (tripId: string | undefined) => {
      set(() => ({
        currentTripId: tripId,
      }));
    },
    getCurrentTrip: () => {
      const state = get();
      const tripId = state.currentTripId;
      if (!tripId) {
        return undefined;
      }
      return state.getTrip(tripId);
    },
    getTrip: (id: string | undefined): TripSliceTrip | undefined => {
      if (!id) {
        return undefined;
      }
      const trip = get().trip[id];
      if (!trip) {
        return undefined;
      }
      return trip;
    },
    getActivity: (id: string): TripSliceActivity | undefined => {
      if (!id) {
        return undefined;
      }
      const activity = get().activity[id];
      if (!activity) {
        return undefined;
      }
      return activity;
    },
    getActivities: (ids: string[]): TripSliceActivity[] => {
      const activities = ids.map((id) => get().activity[id]);
      return activities;
    },
    getAccommodation: (id: string): TripSliceAccommodation | undefined => {
      if (!id) {
        return undefined;
      }
      const accommodation = get().accommodation[id];
      if (!accommodation) {
        return undefined;
      }
      return accommodation;
    },
    getMacroplan: (id: string): TripSliceMacroplan | undefined => {
      if (!id) {
        return undefined;
      }
      const macroplan = get().macroplan[id];
      if (!macroplan) {
        return undefined;
      }
      return macroplan;
    },
    getCommentGroups: (ids: string[]): TripSliceCommentGroup[] => {
      const commentGroups = ids.map((id) => get().commentGroup[id]);
      return commentGroups;
    },
    getCommentGroup: (
      id: string | undefined,
    ): TripSliceCommentGroup | undefined => {
      if (!id) {
        return undefined;
      }
      const commentGroup = get().commentGroup[id];
      if (!commentGroup) {
        return undefined;
      }
      return commentGroup;
    },
    getAllComments: (
      tripId: string | undefined,
    ): TripSliceCommentWithUser[] => {
      if (!tripId) {
        return [];
      }
      const state = get();
      const trip = state.trip[tripId];
      if (!trip) {
        return [];
      }
      const commentGroups = trip.commentGroupIds.map(
        (id) => state.commentGroup[id],
      );
      const comments = commentGroups
        .flatMap((commentGroup) => {
          return commentGroup.commentIds.map((id) => {
            const comment = state.comment[id];
            if (!comment) {
              return undefined;
            }
            const user = state.commentUser[comment.userId];
            return {
              ...comment,
              user: user,
            } satisfies TripSliceCommentWithUser;
          });
        })
        .filter((comment): comment is TripSliceCommentWithUser => {
          return comment !== undefined;
        });
      comments.sort((a, b) => {
        // sort by createdAt descending
        return b.createdAt - a.createdAt;
      });
      return comments;
    },
    getComments: (ids: string[]): TripSliceCommentWithUser[] => {
      const state = get();
      const comments = ids
        .map((id) => {
          const comment = state.comment[id];
          if (!comment) {
            return undefined;
          }
          const user = state.commentUser[comment.userId];
          return {
            ...comment,
            user: user,
          } satisfies TripSliceCommentWithUser;
        })
        .filter((comment): comment is TripSliceCommentWithUser => {
          return comment !== undefined;
        });
      comments.sort((a, b) => {
        // sort by createdAt descending
        return b.createdAt - a.createdAt;
      });
      return comments;
    },
    getExpense: (id: string): TripSliceExpense | undefined => {
      if (!id) {
        return undefined;
      }
      const expense = get().expense[id];
      if (!expense) {
        return undefined;
      }
      return expense;
    },
    getExpenses: (ids: string[]): TripSliceExpense[] => {
      const expenses = ids.map((id) => get().expense[id]);
      return expenses;
    },
    getTripUsers: (ids: string[]): TripSliceTripUser[] => {
      const tripUsers = ids.map((id) => get().tripUser[id]);
      return tripUsers;
    },
    getAccommodations: (ids: string[]): TripSliceAccommodation[] => {
      const accommodations = ids.map((id) => get().accommodation[id]);
      return accommodations;
    },
    getMacroplans: (ids: string[]): TripSliceMacroplan[] => {
      const macroplans = ids.map((id) => get().macroplan[id]);
      return macroplans;
    },
  };
};

export function useTrip(tripId: string | undefined) {
  const trip = useBoundStore(useShallow((state) => state.getTrip(tripId)));
  return trip;
}
export function useCurrentTrip() {
  const trip = useBoundStore(useShallow((state) => state.getCurrentTrip()));
  return trip;
}

export function useTripActivity(activityId: string) {
  const activity = useBoundStore(
    useShallow((state) => state.getActivity(activityId)),
  );
  return activity;
}

export function useTripActivities(activityIds: string[]) {
  const tripUsers = useBoundStore(
    useShallow((state) => state.getActivities(activityIds)),
  );
  return tripUsers;
}
export function useTripAccommodation(accommodationId: string) {
  const accommodation = useBoundStore(
    useShallow((state) => state.getAccommodation(accommodationId)),
  );
  return accommodation;
}
export function useTripMacroplan(macroplanId: string) {
  const macroplan = useBoundStore(
    useShallow((state) => state.getMacroplan(macroplanId)),
  );
  return macroplan;
}
export function useTripAllComments(tripId: string | undefined) {
  const comments = useBoundStore(
    useShallow((state) => state.getAllComments(tripId)),
  );
  return comments;
}
export function useTripCommentGroup(commentGroupId: string | undefined) {
  const commentGroup = useBoundStore(
    useShallow((state) => state.getCommentGroup(commentGroupId)),
  );
  return commentGroup;
}
export function useTripExpense(expenseId: string) {
  const expense = useBoundStore(
    useShallow((state) => state.getExpense(expenseId)),
  );
  return expense;
}
export function useTripExpenses(expenseIds: string[]) {
  const tripUsers = useBoundStore(
    useShallow((state) => state.getExpenses(expenseIds)),
  );
  return tripUsers;
}

export function useTripComments(ids: string[]) {
  const comments = useBoundStore(useShallow((state) => state.getComments(ids)));
  return comments;
}

export function useTripUserIds(userIds: string[]) {
  const tripUsers = useBoundStore(
    useShallow((state) => state.getTripUsers(userIds)),
  );
  return tripUsers;
}
export function useTripAccommodations(
  accommodationIds: string[],
): TripSliceAccommodation[] {
  const accommodations = useBoundStore(
    useShallow((state) => state.getAccommodations(accommodationIds)),
  );
  return accommodations;
}
export function useTripMacroplans(
  macroplanIds: string[],
): TripSliceMacroplan[] {
  const macroplans = useBoundStore(
    useShallow((state) => state.getMacroplans(macroplanIds)),
  );
  return macroplans;
}
