import { DateTime } from 'luxon';
import type { DayGroups } from '../Activity/eventGrouping';
import type {
  TripSliceAccommodation,
  TripSliceTrip,
} from '../Trip/store/types';

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
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone,
  );
  const tripEndDay = tripEndDateTime.diff(tripStartDateTime, 'days').days;

  for (const accommodation of accommodations) {
    const accommodationCheckInDateTime = DateTime.fromMillis(
      accommodation.timestampCheckIn,
    ).setZone(trip.timeZone);
    const accommodationCheckInDay =
      accommodationCheckInDateTime
        .startOf('day')
        .diff(tripStartDateTime, 'days').days + 1;
    const accommodationCheckOutDateTime = DateTime.fromMillis(
      accommodation.timestampCheckOut,
    ).setZone(trip.timeZone);
    const accommodationCheckOutDay =
      accommodationCheckOutDateTime
        .startOf('day')
        .diff(tripStartDateTime, 'days').days + 1;

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
