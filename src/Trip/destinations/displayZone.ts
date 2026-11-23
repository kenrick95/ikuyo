import { useMemo } from 'react';
import { useBoundStore } from '../../data/store';
import { useTripLocalState } from '../store/hooks';
import type { TripSliceTrip } from '../store/types';

export function useTripDisplayZone(trip: TripSliceTrip | undefined) {
  const preferred = useTripLocalState(trip?.id)?.displayTimeZone;
  const setLocal = useBoundStore((state) => state.setTripLocalState);
  const zones = useMemo(
    () =>
      trip
        ? [
            ...new Set([
              trip.timeZone,
              ...(trip.destinations ?? []).map((item) => item.timeZone),
            ]),
          ]
        : [],
    [trip],
  );
  const zone =
    preferred && zones.includes(preferred) ? preferred : trip?.timeZone;
  return {
    zone,
    zones,
    setZone: (value: string) => {
      if (trip && zones.includes(value))
        setLocal(trip.id, { displayTimeZone: value });
    },
  };
}

export function calendarTrip(
  trip: TripSliceTrip,
  zone?: string,
): TripSliceTrip {
  if (!zone || zone === trip.timeZone) return trip;
  const inZone = (value: number) =>
    Temporal.Instant.fromEpochMilliseconds(value).toZonedDateTimeISO(zone);
  return {
    ...trip,
    timeZone: zone,
    timestampStart: inZone(trip.timestampStart).startOfDay().epochMilliseconds,
    timestampEnd: inZone(trip.timestampEnd - 1)
      .add({ days: 1 })
      .startOfDay().epochMilliseconds,
  };
}
