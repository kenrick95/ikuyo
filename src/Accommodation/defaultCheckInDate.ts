import type {
  TripSliceAccommodation,
  TripSliceTrip,
} from '../Trip/store/types';

/**
 * Finds the first trip day without an accommodation. The final day is excluded
 * because the new-accommodation default checks out at 11am on that day.
 */
export function getDefaultAccommodationCheckInDate(
  trip: TripSliceTrip,
  accommodations: TripSliceAccommodation[],
): Temporal.PlainDate {
  const tripStart = Temporal.Instant.fromEpochMilliseconds(trip.timestampStart)
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate();
  const tripEnd = Temporal.Instant.fromEpochMilliseconds(trip.timestampEnd)
    .toZonedDateTimeISO(trip.timeZone)
    .toPlainDate()
    .subtract({ days: 1 });

  for (
    let date = tripStart;
    Temporal.PlainDate.compare(date, tripEnd) < 0;
    date = date.add({ days: 1 })
  ) {
    const isOccupied = accommodations.some((accommodation) => {
      const checkInDate = Temporal.Instant.fromEpochMilliseconds(
        accommodation.timestampCheckIn,
      )
        .toZonedDateTimeISO(trip.timeZone)
        .toPlainDate();
      const checkOutDate = Temporal.Instant.fromEpochMilliseconds(
        accommodation.timestampCheckOut,
      )
        .toZonedDateTimeISO(trip.timeZone)
        .toPlainDate();

      return (
        Temporal.PlainDate.compare(date, checkInDate) >= 0 &&
        Temporal.PlainDate.compare(date, checkOutDate) <= 0
      );
    });

    if (!isOccupied) return date;
  }

  return tripStart;
}
