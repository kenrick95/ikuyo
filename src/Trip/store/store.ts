import type { StateCreator } from 'zustand';

import { db } from '../../data/db';
import type { BoundStoreType } from '../../data/store';
import {
  deriveNewAccommodationState,
  deriveNewActivityState,
  deriveNewCommentAndCommentUserState,
  deriveNewCommentGroupState,
  deriveNewExpenseState,
  deriveNewMacroplanState,
  deriveNewTripState,
  deriveNewTripUserState,
} from './deriveState';
import type {
  DbTripQueryReturnType,
  TripSlice,
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceCommentGroup,
  TripSliceCommentWithUser,
  TripSliceExpense,
  TripSliceMacroplan,
  TripSliceTrip,
  TripSliceTripUser,
} from './types';

export const createTripSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripSlice
> = (set, get) => {
  return {
    currentTripId: undefined,
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
          const trip = data?.trip?.[0] satisfies
            | DbTripQueryReturnType
            | undefined;

          if (!trip) {
            return;
          }
          set((state) => {
            const newAccommodationState = deriveNewAccommodationState(
              state,
              trip,
            );
            const newActivityState = deriveNewActivityState(state, trip);
            const newMacroplanState = deriveNewMacroplanState(state, trip);
            const newCommentGroupState = deriveNewCommentGroupState(
              state,
              trip,
            );
            const newTripUserState = deriveNewTripUserState(state, trip);
            const newExpenseState = deriveNewExpenseState(state, trip);
            const { newCommentState, newCommentUserState } =
              deriveNewCommentAndCommentUserState(state, trip);
            const newTripState = deriveNewTripState(state, trip);

            return {
              trip: newTripState,
              accommodation: newAccommodationState,
              activity: newActivityState,
              macroplan: newMacroplanState,
              commentGroup: newCommentGroupState,
              expense: newExpenseState,
              tripUser: newTripUserState,
              comment: newCommentState,
              commentUser: newCommentUserState,
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
      const state = get();
      const activities = ids
        .map((id) => state.activity[id])
        .filter((activity): activity is TripSliceActivity => {
          return activity !== undefined;
        });
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
      const state = get();
      const commentGroups = ids
        .map((id) => state.commentGroup[id])
        .filter((commentGroup): commentGroup is TripSliceCommentGroup => {
          return commentGroup !== undefined;
        });
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
      const state = get();
      const expenses = ids
        .map((id) => state.expense[id])
        .filter((expense): expense is TripSliceExpense => {
          return expense !== undefined;
        });
      return expenses;
    },
    getTripUsers: (ids: string[]): TripSliceTripUser[] => {
      const state = get();
      const tripUsers = ids
        .map((id) => state.tripUser[id])
        .filter((tripUser): tripUser is TripSliceTripUser => {
          return tripUser !== undefined;
        });
      return tripUsers;
    },
    getAccommodations: (ids: string[]): TripSliceAccommodation[] => {
      const state = get();
      const accommodations = ids
        .map((id) => state.accommodation[id])
        .filter((accommodation): accommodation is TripSliceAccommodation => {
          return accommodation !== undefined;
        });
      return accommodations;
    },
    getMacroplans: (ids: string[]): TripSliceMacroplan[] => {
      const state = get();
      const macroplans = ids
        .map((id) => state.macroplan[id])
        .filter((macroplan): macroplan is TripSliceMacroplan => {
          return macroplan !== undefined;
        });
      return macroplans;
    },
  };
};
