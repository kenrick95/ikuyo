import { DateTime } from 'luxon';
import { AccommodationDisplayTimeMode } from '../Accommodation/AccommodationDisplayTimeMode';
import type {
  TripSliceAccommodation,
  TripSliceActivity,
  TripSliceActivityWithTime,
  TripSliceMacroplan,
  TripSliceTrip,
} from '../Trip/store/types';
import { ActivityFlag, hasActivityFlag } from './activityFlag';

export type DayGroups = {
  /** entities that are in "bucket list" or "idea list": either marked explicitly, OR no start time, OR no end time */
  ideas: {
    activities: TripSliceActivity[];
    accommodations: TripSliceAccommodation[];
    macroplans: TripSliceMacroplan[];
  };
  inTrip: Array<{
    /** DateTime in trip time zone */
    startDateTime: DateTime;
    columns: number;
    activities: TripSliceActivityWithTime[];
    /** activity id --> {start: column index (1-based), end: column index (1-based)} */
    activityColumnIndexMap: Map<string, { start: number; end: number }>;
    accommodations: TripSliceAccommodation[];
    /** accommodation id --> { displayTimeMode } */
    accommodationProps: Map<
      string,
      { displayTimeMode: AccommodationDisplayTimeMode }
    >;

    macroplans: TripSliceMacroplan[];
  }>;
};

/**
 * Return `DateTime` objects for each of day in the trip.
 * Activities spanning multiple days (can be longer than 24 hours) are automatically
 * "split" across days with timestamps clipped to day boundaries.
 */
export function groupActivitiesByDays({
  trip,
  activities,
  macroplans,
  accommodations,
}: {
  trip: TripSliceTrip;
  activities: TripSliceActivity[];
  macroplans: TripSliceMacroplan[];
  accommodations: TripSliceAccommodation[];
}): DayGroups {
  const res: DayGroups = {
    inTrip: [],
    ideas: {
      activities: [],
      accommodations: [],
      macroplans: [],
    },
  };
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone,
  );
  const tripDuration = tripEndDateTime.diff(tripStartDateTime, 'days');
  const activitiesWithTime: TripSliceActivityWithTime[] = [];
  const activityIdeas: TripSliceActivity[] = [];
  for (const activity of activities) {
    if (
      activity.timestampStart !== undefined &&
      activity.timestampEnd !== undefined &&
      activity.timestampStart !== null &&
      activity.timestampEnd !== null
    ) {
      activitiesWithTime.push({
        ...activity,
        timestampStart: activity.timestampStart,
        timestampEnd: activity.timestampEnd,
      });
      // Activities that have both start and end time AND explicitly marked as ideas are included in BOTH `activitiesWithTime` and `activityIdeas`
      if (hasActivityFlag(activity.flags, ActivityFlag.IsIdea)) {
        activityIdeas.push(activity);
      }
    } else {
      activityIdeas.push(activity);
    }
  }
  res.ideas.activities = activityIdeas;

  for (let d = 0; d < tripDuration.days; d++) {
    const dayStartDateTime = tripStartDateTime.plus({ day: d });
    const dayEndDateTime = tripStartDateTime.plus({ day: d + 1 });
    const dayActivities: TripSliceActivityWithTime[] = [];
    const dayAccommodations: TripSliceAccommodation[] = [];
    const dayMacroplans: TripSliceMacroplan[] = [];

    const accommodationProps: Map<
      string,
      { displayTimeMode: AccommodationDisplayTimeMode }
    > = new Map();
    const activityColumnIndexMap: Map<string, { start: number; end: number }> =
      new Map();
    for (const activity of activitiesWithTime) {
      activityColumnIndexMap.set(activity.id, { start: 1, end: 1 });
      const activityStartDateTime = DateTime.fromMillis(
        activity.timestampStart,
      ).setZone(activity.timeZoneStart ?? trip.timeZone);
      const activityEndDateTime = DateTime.fromMillis(
        activity.timestampEnd,
      ).setZone(activity.timeZoneEnd ?? trip.timeZone);

      // Check if activity overlaps with this day
      if (
        activityStartDateTime < dayEndDateTime &&
        activityEndDateTime > dayStartDateTime
      ) {
        // Clip the activity times to the day boundaries
        const clippedStartDateTime = DateTime.max(
          activityStartDateTime,
          dayStartDateTime,
        );
        const clippedEndDateTime = DateTime.min(
          activityEndDateTime,
          dayEndDateTime,
        );

        // Create a new activity object with clipped timestamps
        const clippedActivity: TripSliceActivityWithTime = {
          ...activity,
          timestampStart: clippedStartDateTime.toMillis(),
          timestampEnd: clippedEndDateTime.toMillis(),
        };

        dayActivities.push(clippedActivity);
      }
    }
    dayActivities.sort((a, b) => {
      if (a.timestampStart === b.timestampStart) {
        return a.timestampEnd - b.timestampEnd;
      }
      return a.timestampStart - b.timestampStart;
    });

    for (const macroplan of macroplans) {
      const macroplanStartDateTime = DateTime.fromMillis(
        macroplan.timestampStart,
      ).setZone(macroplan.timeZoneStart ?? trip.timeZone);
      const macroplanEndDateTime = DateTime.fromMillis(
        macroplan.timestampEnd,
      ).setZone(macroplan.timeZoneEnd ?? trip.timeZone);
      // if the macroplan involves this day, add it to the list
      if (
        macroplanStartDateTime <= dayStartDateTime &&
        dayEndDateTime <= macroplanEndDateTime
      ) {
        dayMacroplans.push(macroplan);
      }
    }

    for (const accommodation of accommodations) {
      const accommodationCheckInDateTime = DateTime.fromMillis(
        accommodation.timestampCheckIn,
      ).setZone(accommodation.timeZoneCheckIn ?? trip.timeZone);
      const accommodationCheckOutDateTime = DateTime.fromMillis(
        accommodation.timestampCheckOut,
      ).setZone(accommodation.timeZoneCheckOut ?? trip.timeZone);
      if (
        // This day is the start of the stay: check in time is this day
        dayStartDateTime <= accommodationCheckInDateTime &&
        accommodationCheckInDateTime <= dayEndDateTime
      ) {
        dayAccommodations.push(accommodation);
        accommodationProps.set(accommodation.id, {
          displayTimeMode: AccommodationDisplayTimeMode.CheckIn,
        });
      } else if (
        // This day is during the stay: check in time is before this day, check out time is after this day
        accommodationCheckInDateTime <= dayStartDateTime &&
        accommodationCheckInDateTime <= dayEndDateTime &&
        accommodationCheckOutDateTime >= dayStartDateTime &&
        accommodationCheckOutDateTime >= dayEndDateTime
      ) {
        dayAccommodations.push(accommodation);
        accommodationProps.set(accommodation.id, {
          displayTimeMode: AccommodationDisplayTimeMode.None,
        });
      } else if (
        // This day is the end of the stay: check out time is this day
        dayStartDateTime <= accommodationCheckOutDateTime &&
        accommodationCheckOutDateTime <= dayEndDateTime
      ) {
        dayAccommodations.push(accommodation);
        accommodationProps.set(accommodation.id, {
          displayTimeMode: AccommodationDisplayTimeMode.CheckOut,
        });
      }
    }

    // Finding max overlaps: https://stackoverflow.com/a/46532590/917957
    enum Token {
      Start = 0,
      End = 1,
    }
    const ranges: Array<[number, Token, TripSliceActivityWithTime]> = [];
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

    const activitiesByTrack: Array<TripSliceActivityWithTime[]> = [];

    for (const range of ranges) {
      if (range[1] === Token.Start) {
        overlaps += 1;

        // Find unoccupied track
        let trackIndex = 0;
        for (
          trackIndex = 0;
          trackIndex < activitiesByTrack.length;
          trackIndex++
        ) {
          const lastActivity = activitiesByTrack[trackIndex].at(-1);
          if (
            lastActivity &&
            lastActivity.timestampEnd - 0.5 < range[2].timestampStart
          ) {
            break;
          }
        }
        if (trackIndex === activitiesByTrack.length) {
          activitiesByTrack.push([range[2]]);
        } else {
          activitiesByTrack[trackIndex].push(range[2]);
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

    // Make activity on the final occupied track expand to occupy till end of column
    // Idea: for each activity, check the next tracks if the time is occupied or not
    // TODO: but this is very ... inefficient...
    // Interval tree? https://en.wikipedia.org/wiki/Interval_tree
    for (
      let trackIndex = 0;
      trackIndex < activitiesByTrack.length;
      trackIndex++
    ) {
      const trackActivities = activitiesByTrack[trackIndex];
      for (
        let trackActivityIndex = 0;
        trackActivityIndex < trackActivities.length;
        trackActivityIndex++
      ) {
        const trackActivity = trackActivities[trackActivityIndex];

        let canExpandTillEndOfTrack = true;
        for (
          let nextTrackIndex = trackIndex + 1;
          nextTrackIndex < activitiesByTrack.length;
          nextTrackIndex++
        ) {
          const nextTrackActivities = activitiesByTrack[nextTrackIndex];
          for (
            let nextTrackActivityIndex = 0;
            nextTrackActivityIndex < nextTrackActivities.length;
            nextTrackActivityIndex++
          ) {
            const nextTrackActivity =
              nextTrackActivities[nextTrackActivityIndex];

            if (
              trackActivity.timestampEnd - 0.5 <
                nextTrackActivity.timestampStart ||
              trackActivity.timestampStart >
                nextTrackActivity.timestampEnd - 0.5
            ) {
              // No overlap with this activity
            } else {
              // Overlap with this activity
              canExpandTillEndOfTrack = false;
              break;
            }
          }
          if (!canExpandTillEndOfTrack) {
            break;
          }
        }

        if (canExpandTillEndOfTrack) {
          const activityId = trackActivity.id;

          activityColumnIndexMap.set(activityId, {
            start: trackIndex + 1,
            end: activitiesByTrack.length,
          });
        }
      }
    }
    res.inTrip.push({
      startDateTime: dayStartDateTime,
      columns: Math.max(maxOverlaps, 1),
      activities: dayActivities,
      activityColumnIndexMap,
      accommodations: dayAccommodations,
      accommodationProps,
      macroplans: dayMacroplans,
    });
  }

  return res;
}
