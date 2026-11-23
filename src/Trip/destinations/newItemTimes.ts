import { type DestinationTrip, destinationAt } from './destinations';

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
  const startDestination = destinationAt(trip, start.epochMilliseconds);
  const endDestination = separateEndpoints
    ? destinationAt(trip, end.epochMilliseconds)
    : startDestination;
  return [
    start.withTimeZone(startDestination.timeZone).toPlainDateTime(),
    end.withTimeZone(endDestination.timeZone).toPlainDateTime(),
    startDestination.timeZone,
    endDestination.timeZone,
    start.epochMilliseconds,
    end.epochMilliseconds,
  ] as const;
}

export function itemZonedTime(
  value: Temporal.PlainDateTime | undefined,
  zone: string,
  instant?: number,
) {
  if (!value) return undefined;
  if (instant !== undefined) {
    const original =
      Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(zone);
    if (original.toPlainDateTime().equals(value)) return original;
  }
  return value.toZonedDateTime(zone);
}
