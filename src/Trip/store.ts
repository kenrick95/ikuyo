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
  type: DbCommentGroupObjectType;
  objectId: string;
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
  /** return: unsubscribe function */
  subscribeTrip: (id: string) => () => void;

  getTrip: (id: string) => TripSliceTrip | undefined;
  getActivity: (id: string) => TripSliceActivity | undefined;
  getAccommodation: (id: string) => TripSliceAccommodation | undefined;
  getMacroplan: (id: string) => TripSliceMacroplan | undefined;
  getCommentGroup: (id: string) => TripSliceCommentGroup | undefined;
  getExpense: (id: string) => TripSliceExpense | undefined;
  getTripUsers: (ids: string[]) => TripSliceTripUser[];
}

export const createTripSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripSlice
> = (set, get) => {
  return {
    trip: {},
    accommodation: {},
    activity: {},
    macroplan: {},
    commentGroup: {},
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
                $: { fields: ['id', 'handle', 'activated'] },
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
              if (!objectType) {
                continue;
              }
              let objectId: string | undefined;
              if (objectType === COMMENT_GROUP_OBJECT_TYPE.ACTIVITY) {
                objectId = commentGroup.object?.activity?.[0]?.id;
              } else if (
                objectType === COMMENT_GROUP_OBJECT_TYPE.ACCOMMODATION
              ) {
                objectId = commentGroup.object?.accommodation?.[0]?.id;
              } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.MACROPLAN) {
                objectId = commentGroup.object?.macroplan?.[0]?.id;
              } else if (objectType === COMMENT_GROUP_OBJECT_TYPE.EXPENSE) {
                objectId = commentGroup.object?.expense?.[0]?.id;
              }
              if (!objectId) {
                continue;
              }
              newCommentGroupState[commentGroup.id] = {
                ...commentGroup,
                tripId: trip.id,
                type: objectType,
                objectId,
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
              } satisfies TripSliceTripUser;
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
    getTrip: (id: string): TripSliceTrip | undefined => {
      const trip = get().trip[id];
      if (!trip) {
        return undefined;
      }
      return trip;
    },
    getActivity: (id: string): TripSliceActivity | undefined => {
      const activity = get().activity[id];
      if (!activity) {
        return undefined;
      }
      return activity;
    },
    getAccommodation: (id: string): TripSliceAccommodation | undefined => {
      const accommodation = get().accommodation[id];
      if (!accommodation) {
        return undefined;
      }
      return accommodation;
    },
    getMacroplan: (id: string): TripSliceMacroplan | undefined => {
      const macroplan = get().macroplan[id];
      if (!macroplan) {
        return undefined;
      }
      return macroplan;
    },
    getCommentGroup: (id: string): TripSliceCommentGroup | undefined => {
      const commentGroup = get().commentGroup[id];
      if (!commentGroup) {
        return undefined;
      }
      return commentGroup;
    },
    getExpense: (id: string): TripSliceExpense | undefined => {
      const expense = get().expense[id];
      if (!expense) {
        return undefined;
      }
      return expense;
    },
    getTripUsers: (ids: string[]): TripSliceTripUser[] => {
      const tripUsers = ids.map((id) => get().tripUser[id]);
      return tripUsers;
    },
  };
};

export function useTrip(tripId: string) {
  const trip = useBoundStore(useShallow((state) => state.getTrip(tripId)));
  return trip;
}
export function useTripActivity(activityId: string) {
  const activity = useBoundStore(
    useShallow((state) => state.getActivity(activityId)),
  );
  return activity;
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
export function useTripCommentGroup(commentGroupId: string) {
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

export function useTripUserIds(userIds: string[]) {
  const tripUsers = useBoundStore(
    useShallow((state) => state.getTripUsers(userIds)),
  );
  return tripUsers;
}
