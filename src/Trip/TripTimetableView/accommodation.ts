import type { DayGroups } from '../../Activity/eventGrouping';
import type { TripSliceAccommodation, TripSliceTrip } from '../store/types';

export function getAccommodationIndexes({
  trip,
  accommodations,
}: {
  trip: TripSliceTrip;
  accommodations: TripSliceAccommodation[];
}) {
  const res: Array<{
    accommodation: TripSliceAccommodation;
    day: {
      start: number;
      end: number;
      startColumn: number;
      endColumn: number | undefined;
    };
  }> = [];
  const tripStartDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  ).toZonedDateTimeISO(trip.timeZone);
  const tripEndDateTime = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampEnd,
  ).toZonedDateTimeISO(trip.timeZone);
  const tripEndDay = tripEndDateTime.since(tripStartDateTime, {
    largestUnit: 'days',
  }).days;

  for (const accommodation of accommodations) {
    // Even if accommodation check in and check out can have their own time zones, need to use trip time zone to calculate day indexes for accuracy
    const accommodationCheckInDateTimeTripTimeZone =
      Temporal.Instant.fromEpochMilliseconds(
        accommodation.timestampCheckIn,
      ).toZonedDateTimeISO(trip.timeZone);
    const accommodationCheckInDay =
      Math.floor(
        accommodationCheckInDateTimeTripTimeZone
          .startOfDay()
          .since(tripStartDateTime, { largestUnit: 'days' }).days,
      ) + 1;
    const accommodationCheckOutDateTimeTripTimeZone =
      Temporal.Instant.fromEpochMilliseconds(
        accommodation.timestampCheckOut,
      ).toZonedDateTimeISO(trip.timeZone);
    const accommodationCheckOutDay =
      Math.floor(
        accommodationCheckOutDateTimeTripTimeZone
          .startOfDay()
          .since(tripStartDateTime, { largestUnit: 'days' }).days,
      ) + 1;

    res.push({
      accommodation,
      day: {
        start: accommodationCheckInDay,
        end: accommodationCheckOutDay,
        startColumn: accommodationCheckInDay === 1 ? 1 : 2,
        endColumn: accommodationCheckOutDay === tripEndDay ? 2 : 1,
      },
    });
  }

  return res;
}

export function generateAccommodationGridTemplateColumns(
  dayGroups: DayGroups,
): string {
  let str = '';

  // 1 day always have 2 columns
  // Generate something like:
  // [d1-c1]     360 / 2 fr
  // [d1-ce1 d1-c2] 360 / 2 fr
  // [d1-ce2 d2-c1] 360 / 2 fr
  // [d2-ce1 d2-c2] 360 / 2 fr
  // [d2-ce2 d3-c1] 360 / 2 fr
  // [d3-ce1 d3-c2] 360 / 2 fr
  // [d3-ce2 d4-c1] 360 / 2 fr
  // [d4-ce1 d4-c2] 360 / 2 fr
  // [d4-ce2]

  const maxColumns = 2;
  for (let dayIndex = 0; dayIndex < dayGroups.inTrip.length; dayIndex++) {
    const colWidth = `minmax(${String(150 / 2)}px,${String(360 / 2)}fr)`;
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const lineNames: string[] = [];
      if (colIndex === 0 && dayIndex > 0) {
        lineNames.push(`d${String(dayIndex)}-ce${String(maxColumns)}`);
      }
      if (colIndex > 0) {
        lineNames.push(`d${String(dayIndex + 1)}-ce${String(colIndex)}`);
      }

      lineNames.push(`d${String(dayIndex + 1)}-c${String(colIndex + 1)}`);

      str += ` [${lineNames.join(' ')}] ${colWidth}`;
    }
  }

  str += ` [d${String(dayGroups.inTrip.length)}-ce${String(maxColumns)}]`;

  return str;
}
