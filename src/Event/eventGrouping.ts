import { DateTime } from 'luxon';
import { DbTripWithActivity, DbActivityWithTrip } from '../data/types';

export type DayGroups = Array<{
  /** DateTime in trip time zone */
  startDateTime: DateTime;
  columns: number;
  activities: DbActivityWithTrip[];
  /** activity id --> {start: column index (1-based), end: column index (1-based)} */
  activityColumnIndexMap: Map<string, { start: number; end: number }>;
}>;

/** Return `DateTime` objects for each of day in the trip */
export function groupActivitiesByDays(trip: DbTripWithActivity): DayGroups {
  const res: DayGroups = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone
  );
  const tripDuration = tripEndDateTime.diff(tripStartDateTime, 'days');
  for (let d = 0; d < tripDuration.days; d++) {
    const dayStartDateTime = tripStartDateTime.plus({ day: d });
    const dayEndDateTime = tripStartDateTime.plus({ day: d + 1 });
    const dayActivities: DbActivityWithTrip[] = [];
    const activityColumnIndexMap: Map<string, { start: number; end: number }> =
      new Map();
    for (const activity of trip.activity) {
      activityColumnIndexMap.set(activity.id, { start: 1, end: 1 });
      const activityStartDateTime = DateTime.fromMillis(
        activity.timestampStart
      ).setZone(trip.timeZone);
      const activityEndDateTime = DateTime.fromMillis(
        activity.timestampEnd
      ).setZone(trip.timeZone);
      if (
        dayStartDateTime <= activityStartDateTime &&
        activityEndDateTime <= dayEndDateTime
      ) {
        dayActivities.push(activity);
      }
    }

    // Finding max overlaps: https://stackoverflow.com/a/46532590/917957
    enum Token {
      Start,
      End,
    }
    const ranges: Array<[number, Token, DbActivityWithTrip]> = [];
    for (const activity of dayActivities) {
      ranges.push([activity.timestampStart, Token.Start, activity]);
      // "End" is half a millisecond before start so that we don't count event that ends at exact time as next start one as overlapping
      ranges.push([activity.timestampEnd - 0.5, Token.End, activity]);
    }
    ranges.sort((a, b) => {
      // Sort by time, if tie, break by Start first then End
      if (a[0] === b[0]) {
        return a[1] - b[1];
      }
      return a[0] - b[0];
    });
    let maxOverlaps = 0;
    let overlaps = 0;
    const tracksLastTimestamp: Array<number> = [0];

    for (const range of ranges) {
      if (range[1] === Token.Start) {
        overlaps += 1;
        // Find a new track
        let trackIndex = 0;
        for (
          trackIndex = 0;
          trackIndex < tracksLastTimestamp.length;
          trackIndex++
        ) {
          if (tracksLastTimestamp[trackIndex] < range[2].timestampStart) {
            break;
          }
        }
        if (trackIndex === tracksLastTimestamp.length) {
          tracksLastTimestamp.push(range[2].timestampEnd);
        } else {
          tracksLastTimestamp[trackIndex] = range[2].timestampEnd - 0.5;
        }

        activityColumnIndexMap.set(range[2].id, {
          start: trackIndex + 1,
          end: trackIndex + 1,
        });
      } else {
        overlaps -= 1;
      }
      maxOverlaps = Math.max(overlaps, maxOverlaps);
    }

    res.push({
      startDateTime: dayStartDateTime,
      columns: Math.max(maxOverlaps, 1),
      activities: dayActivities,
      activityColumnIndexMap,
    });
  }

  return res;
}
