import { type DestinationTrip, destinationAt, itinerary } from './destinations';

export type NewItemPrefill = {
  dayOfTrip: number;
  timeStart: string;
  instant?: number;
};

export function newActivityTimes(
  trip: DestinationTrip,
  prefill: NewItemPrefill | undefined,
  previous: number | undefined,
  hours: number,
  separateEndpoints = false,
) {
  const inTripZone = (ms: number) =>
    Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(
      trip.timeZone,
    );
  const start =
    prefill?.instant !== undefined
      ? inTripZone(prefill.instant)
      : prefill
        ? inTripZone(trip.timestampStart)
            .add({ days: prefill.dayOfTrip - 1 })
            .startOfDay()
            .with({
              hour: Number(prefill.timeStart.slice(0, 2)),
              minute: Number(prefill.timeStart.slice(2)),
            })
        : inTripZone(previous ?? trip.timestampStart);
  const end = start.add({ hours });
  const startInstant = start.toInstant();
  const endInstant = end.toInstant();
  const destinations = itinerary(trip);
  const startDestination = destinationAt(destinations, startInstant);
  const endDestination = separateEndpoints
    ? destinationAt(destinations, endInstant)
    : startDestination;
  return [
    start.withTimeZone(startDestination.timeZone).toPlainDateTime(),
    end.withTimeZone(endDestination.timeZone).toPlainDateTime(),
    startDestination.timeZone,
    endDestination.timeZone,
    startInstant,
    endInstant,
  ] as const;
}

export function itemZonedTime(
  value: Temporal.PlainDateTime | undefined,
  zone: string,
  instant?: Temporal.Instant,
) {
  if (!value) return undefined;
  if (instant) {
    const original = instant.toZonedDateTimeISO(zone);
    if (original.toPlainDateTime().equals(value)) return original;
  }
  return value.toZonedDateTime(zone);
}
