import clsx from 'clsx';
import { Activity } from './Activity';
import s from './Timeline.module.scss';
import { DbActivity, DbTrip } from '../data/types';
import { Section } from '@radix-ui/themes';

import { DateTime } from 'luxon';
import { useMemo } from 'react';

const timeClassMapping = [
  s.t0000,
  s.t0100,
  s.t0200,
  s.t0300,
  s.t0400,
  s.t0500,
  s.t0600,
  s.t0700,
  s.t0800,
  s.t0900,
  s.t1000,
  s.t1100,
  s.t1200,
  s.t1300,
  s.t1400,
  s.t1500,
  s.t1600,
  s.t1700,
  s.t1800,
  s.t1900,
  s.t2000,
  s.t2100,
  s.t2200,
  s.t2300,
];
const times = new Array(24).fill(0).map((_, i) => {
  return (
    <TimelineTime
      className={timeClassMapping[i]}
      timeStart={`${i}:00`}
      key={i}
    />
  );
});

export function Timeline({
  trip,
  activities,
}: {
  trip: DbTrip;
  activities: DbActivity[];
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);
  console.log('dayGroups', dayGroups);
  const timelineStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);
  console.log('timelineStyle', timelineStyle);
  return (
    <Section>
      <div className={s.timeline} style={timelineStyle}>
        <TimelineHeader />

        {dayGroups.map((dt, i) => {
          return (
            <TimelineDayHeader
              className={String(i)}
              dateString={dt.startDateTime.toFormat(`ccc, dd LLL yyyy`)}
              key={dt.startDateTime.toISODate()}
            />
          );
        })}

        {times}

        {Object.values(activities).map((activity) => {
          return (
            <Activity
              key={activity.id}
              className={s.timelineItem}
              activity={activity}
            />
          );
        })}
      </div>
    </Section>
  );
}

type DayGroups = Array<{
  startDateTime: DateTime;
  columns: number;
  activities: DbActivity[];
}>;

function generateGridTemplateColumns(dayGroups: DayGroups): string {
  const length = dayGroups.length;
  // TODO: use col names
  return `[time] 65px ${new Array(length)
    .fill(0)
    .map((_, i) => {
      if (i === 0) {
        // first one
        return `[d${i + 1}] 1fr`;
      } else if (i > 0 && i < length - 1) {
        // middle ones
        return `[de${i} d${i + 1}] 1fr`;
      } else if (i === length - 1) {
        // final one
        return `[de${i} d${i + 1}] 1fr [de${i + 1}]`;
      }
    })
    .join(' ')}`;
}

function TimelineDayHeader({
  className,
  dateString,
}: {
  className: string;
  dateString: string;
}) {
  return <div className={clsx(s.timelineColumn, className)}>{dateString}</div>;
}

function TimelineHeader() {
  return <div className={clsx(s.timelineHeader)}>Time\Day</div>;
}
function TimelineTime({
  className,
  timeStart: time,
}: {
  className: string;
  timeStart: string;
}) {
  return <div className={clsx(s.timelineTime, className)}>{time}</div>;
}

/** Return `DateTime` objects for each of day in the trip */
function groupActivitiesByDays(trip: DbTrip): DayGroups {
  const res: DayGroups = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart);
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd);
  const tripDuration = tripEndDateTime.diff(tripStartDateTime, 'days');
  for (let d = 0; d < tripDuration.days; d++) {
    const dayStartDateTime = tripStartDateTime.plus({ day: d });
    const dayEndDateTime = tripStartDateTime.plus({ day: d + 1 });
    const dayActivities: DbActivity[] = [];
    for (const activity of trip.activity ?? []) {
      const activityStartDateTime = DateTime.fromMillis(
        activity.timestampStart
      );
      const activityEndDateTime = DateTime.fromMillis(activity.timestampEnd);
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
    const ranges: Array<[number, Token]> = [];
    for (const activity of dayActivities) {
      ranges.push([activity.timestampStart, Token.Start]);
      ranges.push([activity.timestampEnd, Token.End]);
    }
    ranges.sort((a, b) => {
      return a[0] - b[0];
    });
    let maxOverlaps = 0;
    let overlaps = 0;
    for (const range of ranges) {
      if (range[1] === Token.Start) {
        overlaps += 1;
      } else {
        overlaps -= 1;
      }
      maxOverlaps = Math.max(overlaps, maxOverlaps);
    }

    res.push({
      startDateTime: dayStartDateTime,
      columns: Math.max(maxOverlaps, 1),
      activities: dayActivities,
    });
  }

  return res;
}
