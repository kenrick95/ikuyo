import type { DbAccommodationWithTrip } from '../../Accommodation/db';
import type { DbActivity } from '../../Activity/db';
import type { DbCommentGroupObjectType } from '../../Comment/db';
import type { RegionCode } from '../../data/intl/regions';
import type { TripUserRole } from '../../data/TripUserRole';
import type { DbExpense } from '../../Expense/db';
import type { DbMacroplanWithTrip } from '../../Macroplan/db';
import type { DbTrip } from '../db';

export type TripSliceTrip = Omit<
  DbTrip,
  'accommodation' | 'activity' | 'macroplan' | 'tripUser' | 'commentGroup'
> & {
  /** Trip regions (2-letters, uppercase). Derived from db's trip.region (comma-separated string) */
  regions: RegionCode[];

  accommodationIds: string[];
  activityIds: string[];
  macroplanIds: string[];
  /** This is TripUser's id, not User's id! */
  tripUserIds: string[];
  commentGroupIds: string[];
  expenseIds: string[];

  currentUserRole: TripUserRole;
};
export type TripSliceTripMeta = {
  loading: boolean;
  error: string | undefined;
};
export type TripSliceActivity = Omit<DbActivity, 'trip' | 'commentGroup'> & {
  tripId: string;
  commentGroupId: string | undefined;
};
export type TripSliceActivityWithTime = Omit<
  TripSliceActivity,
  'timestampStart' | 'timestampEnd'
> & {
  timestampStart: number;
  timestampEnd: number;
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

export type DbTripQueryReturnType = {
  id: string;
  title: string;
  timestampStart: number;
  timestampEnd: number;
  currency: string;
  region: string;
  originCurrency: string;
  timeZone: string;
  sharingLevel: number;
  accommodation: {
    id: string;
    createdAt: number;
    lastUpdatedAt: number;
    name: string;
    address: string;
    timestampCheckIn: number;
    timestampCheckOut: number;
    phoneNumber: string;
    notes: string;
    locationLat?: number | null | undefined;
    locationLng?: number | null | undefined;
    locationZoom?: number | null | undefined;
  }[];
  activity: {
    id: string;
    title: string;
    description: string;
    createdAt: number;
    lastUpdatedAt: number;
    timestampStart?: number | null | undefined;
    timestampEnd?: number | null | undefined;
    location: string;
    locationLat?: number | null | undefined;
    locationLng?: number | null | undefined;
    locationZoom?: number | null | undefined;
    locationDestination?: string | null | undefined;
    locationDestinationLat?: number | null | undefined;
    locationDestinationLng?: number | null | undefined;
    locationDestinationZoom?: number | null | undefined;
  }[];
  macroplan: {
    id: string;
    createdAt: number;
    lastUpdatedAt: number;
    name: string;
    notes: string;
    timestampStart: number;
    timestampEnd: number;
  }[];
  expense: {
    id: string;
    title: string;
    currency: string;
    description: string;
    createdAt: number;
    lastUpdatedAt: number;
    timestampIncurred: number;
    amount: number;
    currencyConversionFactor: number;
    amountInOriginCurrency: number;
  }[];
  tripUser: {
    id: string;
    createdAt: number;
    lastUpdatedAt: number;
    role: string;
    user: {
      id: string;
      email: string;
      activated: boolean;
      handle: string;
    }[];
  }[];
  commentGroup: {
    id: string;
    createdAt: number;
    lastUpdatedAt: number;
    status: number;
    comment: {
      id: string;
      createdAt: number;
      lastUpdatedAt: number;
      content: string;
      user:
        | {
            id: string;
            activated: boolean;
            handle: string;
          }
        | undefined;
    }[];
    object:
      | {
          id: string;
          createdAt: number;
          lastUpdatedAt: number;
          type: string;
          activity:
            | {
                id: string;
                title: string;
              }[]
            | undefined;
          accommodation:
            | {
                id: string;
                name: string;
              }[]
            | undefined;
          expense:
            | {
                id: string;
                title: string;
              }[]
            | undefined;
          trip:
            | {
                id: string;
                title: string;
              }[]
            | undefined;
          macroplan:
            | {
                id: string;
                name: string;
              }[]
            | undefined;
        }
      | undefined;
  }[];
};

export interface TripSlice {
  trip: {
    [id: string]: TripSliceTrip;
  };
  tripMeta: {
    [id: string]: TripSliceTripMeta;
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
  timetableDragging: {
    dragging: boolean;
    source: {
      activityId: string | undefined;
    };
  };
  setTimetableDragging: (
    dragging: boolean,
    source?: {
      activityId?: string;
    },
  ) => void;
  setCurrentTripId: (tripId: string | undefined) => void;
  getCurrentTrip: () => TripSliceTrip | undefined;
  getCurrentTripMeta: () => TripSliceTripMeta;
  /** return: unsubscribe function */
  subscribeTrip: (id: string) => () => void;

  getTrip: (id: string | undefined) => TripSliceTrip | undefined;
  getTripMeta: (id: string | undefined) => TripSliceTripMeta | undefined;
  getActivity: (id: string) => TripSliceActivity | undefined;
  getActivities: (ids: string[]) => TripSliceActivity[];
  getAccommodation: (id: string) => TripSliceAccommodation | undefined;
  getMacroplan: (id: string) => TripSliceMacroplan | undefined;
  getCommentGroup: (
    id: string | undefined,
  ) => TripSliceCommentGroup | undefined;
  getAllComments: (tripId: string | undefined) => TripSliceCommentWithUser[];
  getAllCommentsWithLimit: (
    tripId: string | undefined,
    limit: number,
  ) => TripSliceCommentWithUser[];
  getComments: (
    ids: string[],
  ) => Array<TripSliceComment & { user: TripSliceCommentUser }>;
  getExpense: (id: string) => TripSliceExpense | undefined;
  getExpenses: (ids: string[]) => TripSliceExpense[];

  getTripUsers: (ids: string[]) => TripSliceTripUser[];
  getAccommodations: (ids: string[]) => TripSliceAccommodation[];
  getMacroplans: (ids: string[]) => TripSliceMacroplan[];
}
