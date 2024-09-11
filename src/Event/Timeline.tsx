import clsx from 'clsx';
import { Activity } from './Activity';
import s from './Timeline.module.scss';
import { DbActivity, DbTrip } from '../data/types';
import { Section } from '@radix-ui/themes';
import { formatTime } from './time';

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
  const startDateTimes = useMemo(() => getStartDateTimesFromTrip(trip), [trip]);
  return (
    <Section>
      <div className={s.timeline}>
        <TimelineHeader />

        {startDateTimes.map((dt, i) => {
          return (
            <TimelineDayHeader
              className={String(i)}
              dateString={dt.toFormat(`ccc, dd LLL yyyy`)}
              key={dt.toISODate()}
            />
          );
        })}

        {times}

        {Object.values(activities).map((activity) => {
          const timeStart = formatTime(activity.timestampStart);
          const timeEnd = formatTime(activity.timestampEnd);
          return (
            <Activity
              key={activity.id}
              className={s.timelineItem}
              timeStart={timeStart}
              timeEnd={timeEnd}
              title={activity.title}
            />
          );
        })}
      </div>
    </Section>
  );
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
function getStartDateTimesFromTrip(trip: DbTrip): DateTime[] {
  const res: DateTime[] = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart);
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd);
  const tripDuration = tripEndDateTime.diff(tripStartDateTime, 'days');
  for (let d = 0; d < tripDuration.days; d++) {
    res.push(tripStartDateTime.plus({ day: d }));
  }

  return res;
}
