import type { StateCreator } from 'zustand';
import { get as apiGet, setMutationAppliedHandler } from '../../data/apiClient';
import { mapApiTrip } from '../../data/apiTrip';
import type { BoundStoreType } from '../../data/store';
import {
  deriveNewAccommodationState,
  deriveNewActivityState,
  deriveNewCommentAndCommentUserState,
  deriveNewCommentGroupState,
  deriveNewExpenseState,
  deriveNewMacroplanState,
  deriveNewTripState,
  deriveNewTripTaskListAndTaskState,
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
  TripSliceTask,
  TripSliceTaskList,
  TripSliceTrip,
  TripSliceTripMeta,
  TripSliceTripUser,
} from './types';

/** Merge a fetched backend trip into the normalized store slices. */
function mergeApiTrip(
  state: BoundStoreType,
  trip: DbTripQueryReturnType,
): Partial<TripSlice> {
  const newAccommodationState = deriveNewAccommodationState(state, trip);
  const newActivityState = deriveNewActivityState(state, trip);
  const newMacroplanState = deriveNewMacroplanState(state, trip);
  const newCommentGroupState = deriveNewCommentGroupState(state, trip);
  const newTripUserState = deriveNewTripUserState(state, trip);
  const newExpenseState = deriveNewExpenseState(state, trip);
  const { newCommentState, newCommentUserState } =
    deriveNewCommentAndCommentUserState(state, trip);
  const { taskListState, taskState } = deriveNewTripTaskListAndTaskState(
    state,
    trip,
  );
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
    task: taskState,
    taskList: taskListState,
  } satisfies Partial<TripSlice>;
}

/**
 * Fetch a backend trip and merge it into the store. `showLoading` controls
 * whether the tripMeta.loading flag is raised (initial load vs silent refresh).
 * Concurrent refreshes of the same trip are coalesced via an in-flight map so
 * the mutation refresh and the sync poll don't fire redundant requests.
 */
const inFlightTrips = new Map<string, Promise<void>>();
function fetchTripAndMerge(
  set: (fn: (state: BoundStoreType) => Partial<TripSlice> | TripSlice) => void,
  tripId: string,
  showLoading: boolean,
): Promise<void> {
  const existing = inFlightTrips.get(tripId);
  if (existing) return existing;
  const promise = (async () => {
    try {
      if (showLoading) {
        set((state) => ({
          tripMeta: {
            ...state.tripMeta,
            [tripId]: { loading: true, error: undefined },
          },
        }));
      }
      const payload = await apiGet<Record<string, unknown>>(
        `/api/trips/${encodeURIComponent(tripId)}`,
      );
      const trip = mapApiTrip(payload);
      set(
        (state) =>
          ({
            ...mergeApiTrip(state, trip),
            tripMeta: {
              ...state.tripMeta,
              [tripId]: { loading: false, error: undefined },
            },
          }) satisfies Partial<TripSlice>,
      );
    } catch (error: unknown) {
      set(
        (state) =>
          ({
            tripMeta: {
              ...state.tripMeta,
              [tripId]: {
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Unable to load trip',
              },
            },
          }) satisfies Partial<TripSlice>,
      );
      throw error;
    } finally {
      inFlightTrips.delete(tripId);
    }
  })();
  inFlightTrips.set(tripId, promise);
  return promise;
}

export const createTripSlice: StateCreator<
  BoundStoreType,
  [],
  [],
  TripSlice
> = (set, get) => {
  // After any successful backend mutation (add/edit/delete activity,
  // accommodation, day plan, expense, task, comment, trip fields, sharing...),
  // refresh the currently viewed trip immediately so local state reflects the
  // change without waiting for the periodic sync poll. No-op when no trip page
  // is open (currentTripId unset, e.g. login or the trips list).
  setMutationAppliedHandler(() => {
    const tripId = get().currentTripId;
    if (tripId)
      void fetchTripAndMerge(set, tripId, false).catch(() => undefined);
  });
  return {
    currentTripId: undefined,
    tripMeta: {},
    trip: {},
    tripLocalState: {},
    accommodation: {},
    activity: {},
    macroplan: {},
    commentGroup: {},
    comment: {},
    commentUser: {},
    tripUser: {},
    expense: {},
    task: {},
    taskList: {},
    timetableDragging: {
      dragging: false,
      source: {
        activityId: undefined,
        mode: undefined,
      },
    },
    setTimetableDragging: (
      dragging: boolean,
      source:
        | {
            activityId: string;
            mode: 'drag' | 'resize' | undefined;
          }
        | undefined,
    ) => {
      set((state) => {
        return {
          timetableDragging: {
            dragging,
            source: {
              activityId: dragging
                ? (source?.activityId ??
                  state.timetableDragging.source.activityId)
                : undefined,
              mode: dragging
                ? (source?.mode ?? state.timetableDragging.source.mode)
                : undefined,
            },
          },
        };
      });
    },
    subscribeTrip: (tripId: string) => {
      void fetchTripAndMerge(set, tripId, true).catch(() => undefined);
      // Trip data belongs to the shared store; the in-flight fetch is kept so
      // another consumer (including WebMCP's trip-open) can safely await it.
      return () => undefined;
    },
    refreshTrip: (tripId: string) => {
      void fetchTripAndMerge(set, tripId, false).catch(() => undefined);
    },
    loadTrip: async (tripId: string) => {
      await fetchTripAndMerge(set, tripId, true);
      const trip = get().trip[tripId];
      if (!trip) throw new Error(`Trip ${tripId} could not be loaded.`);
      set({ currentTripId: tripId });
      return trip;
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
    getCurrentTripMeta: (): TripSliceTripMeta => {
      const state = get();
      const tripId = state.currentTripId;
      if (!tripId) {
        return { loading: true, error: undefined };
      }
      return (
        state.getTripMeta(tripId) ?? {
          loading: false,
          error: undefined,
        }
      );
    },
    getCurrentTripLocalState: () => {
      const state = get();
      const tripId = state.currentTripId;
      if (!tripId) {
        return undefined;
      }
      return state.getTripLocalState(tripId);
    },
    getTripLocalState: (tripId: string | undefined) => {
      const state = get();
      if (!tripId) {
        return undefined;
      }
      return state.tripLocalState[tripId] ?? undefined;
    },
    setTripLocalState: (
      tripId: string,
      newState: Partial<NonNullable<TripSlice['tripLocalState'][string]>>,
    ) => {
      set((state) => ({
        tripLocalState: {
          ...state.tripLocalState,
          [tripId]: {
            ...state.tripLocalState[tripId],
            ...newState,
          },
        },
      }));
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
    getTripMeta: (id: string | undefined): TripSliceTripMeta | undefined => {
      if (!id) {
        return undefined;
      }
      const tripMeta = get().tripMeta[id];
      if (!tripMeta) {
        return undefined;
      }
      return tripMeta;
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
      const commentGroups = trip.commentGroupIds
        .map((id) => state.commentGroup[id])
        .filter((commentGroup): commentGroup is TripSliceCommentGroup => {
          return commentGroup !== undefined;
        });
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
    getAllCommentsWithLimit: (
      tripId: string | undefined,
      limit: number,
    ): TripSliceCommentWithUser[] => {
      return get().getAllComments(tripId).slice(0, limit);
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
    getTask: (id: string): TripSliceTask | undefined => {
      if (!id) {
        return undefined;
      }
      const task = get().task[id];
      if (!task) {
        return undefined;
      }
      return task;
    },
    getTasks: (ids: string[]): TripSliceTask[] => {
      const state = get();
      const tasks = ids
        .map((id) => state.task[id])
        .filter((task): task is TripSliceTask => {
          return task !== undefined;
        });
      return tasks;
    },
    getTaskList: (id: string): TripSliceTaskList | undefined => {
      if (!id) {
        return undefined;
      }
      const taskList = get().taskList[id];
      if (!taskList) {
        return undefined;
      }
      return taskList;
    },
    getAllTaskLists: (tripId: string | undefined): TripSliceTaskList[] => {
      if (!tripId) {
        return [];
      }
      const state = get();
      const trip = state.trip[tripId];
      if (!trip) {
        return [];
      }
      const taskLists = trip.taskListIds
        .map((id) => state.taskList[id])
        .filter((taskList): taskList is TripSliceTaskList => {
          return taskList !== undefined;
        });
      return taskLists;
    },
  };
};
