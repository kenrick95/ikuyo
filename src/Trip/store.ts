import type { StateCreator } from 'zustand';
import type { DbAccommodationWithTrip } from '../Accommodation/db';
import type { DbActivity } from '../Activity/db';
import {
  COMMENT_GROUP_OBJECT_TYPE,
  type DbCommentGroupObjectType,
} from '../Comment/db';
import { db } from '../data/db';
import type { BoundStoreType } from '../data/store';
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
  /** return: unsubscribe function */
  subscribeTrip: (id: string) => () => void;

  getTrip: (id: string) => TripSliceTrip | undefined;
  getActivity: (id: string) => TripSliceActivity | undefined;
  getAccommodation: (id: string) => TripSliceAccommodation | undefined;
  getMacroplan: (id: string) => TripSliceMacroplan | undefined;
  getCommentGroup: (id: string) => TripSliceCommentGroup | undefined;
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
    subscribeTrip: (tripId: string) => {
      return db.subscribeQuery(
        {
          trip: {
            $: {
              where: {
                id: tripId,
              },
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
            };
          });
        },
      );
    },
  };
};
