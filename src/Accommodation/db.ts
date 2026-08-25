import { deleteMutation, postMutation, putMutation } from '../data/apiClient';
import { id } from '../data/id';
import {
  optimisticAccommodationPatch,
  optimisticAccommodationRemove,
  optimisticAccommodationUpsert,
  optimisticRun,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { DbTrip, DbTripWithAccommodation } from '../Trip/db';
import type { TripSliceAccommodation } from '../Trip/store/types';

export type DbAccommodationWithTrip = Omit<DbAccommodation, 'trip'> & {
  trip: DbTripWithAccommodation;
};

export type DbAccommodation = {
  id: string;
  name: string;
  address: string;
  /** ms */
  timestampCheckIn: number;
  /** ms */
  timestampCheckOut: number;

  /** default: trip.timeZone */
  timeZoneCheckIn: string | null | undefined;
  /** default: trip.timeZone */
  timeZoneCheckOut: string | null | undefined;

  phoneNumber: string;
  notes: string;

  locationLat: number | null | undefined;
  locationLng: number | null | undefined;
  locationZoom: number | null | undefined;

  createdAt: number;
  lastUpdatedAt: number;

  trip: DbTrip | undefined;
};

export async function dbAddAccommodation(
  newAccommodation: Omit<
    DbAccommodation,
    'id' | 'createdAt' | 'lastUpdatedAt' | 'trip'
  >,
  {
    tripId,
  }: {
    tripId: string;
  },
) {
  const newId = id();
  return optimisticRun(
    ['accommodation', 'trip'],
    () => {
      const now = Date.now();
      optimisticAccommodationUpsert(tripId, {
        ...newAccommodation,
        id: newId,
        createdAt: now,
        lastUpdatedAt: now,
        tripId,
        commentGroupId: undefined,
      } as TripSliceAccommodation);
    },
    async () => {
      const result = await postMutation<{ id: string }>(
        `/api/trips/${encodeURIComponent(tripId)}/accommodations`,
        { ...newAccommodation, id: newId },
      );
      return {
        id: result.id,
        transaction: result,
        undo: async () =>
          deleteMutation(
            `/api/accommodations/${encodeURIComponent(result.id)}`,
          ),
      };
    },
  );
}

export async function dbUpdateAccommodation(
  accommodation: Omit<DbAccommodation, 'createdAt' | 'lastUpdatedAt' | 'trip'>,
) {
  return optimisticRun(
    ['accommodation'],
    () => optimisticAccommodationPatch(accommodation.id, accommodation),
    async () => {
      const result = await putMutation<DbAccommodation>(
        `/api/accommodations/${encodeURIComponent(accommodation.id)}`,
        accommodation,
      );
      return { transaction: result, undo: async () => undefined };
    },
  );
}

export async function dbDeleteAccommodation(accommodationId: string) {
  const state = useBoundStore.getState();
  const tripId = state.accommodation[accommodationId]?.tripId;
  return optimisticRun(
    ['accommodation', 'trip'],
    () => {
      if (tripId) optimisticAccommodationRemove(tripId, accommodationId);
    },
    () =>
      deleteMutation(
        `/api/accommodations/${encodeURIComponent(accommodationId)}`,
      ),
  );
}
