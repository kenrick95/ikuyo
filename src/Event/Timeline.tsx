import clsx from 'clsx';
import { Activity } from './Activity';
import s from './Timeline.module.scss';
import { DbActivity } from '../data/types';
import { Section } from '@radix-ui/themes';

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

export function Timeline({ activities }: { activities: DbActivity[] }) {
  return (
    <Section>
      <div className={s.timeline}>
        {times}

        {Object.values(activities).map((activity) => {
          const timeStart = parseTime(activity.timestampStart);
          const timeEnd = parseTime(activity.timestampEnd);
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

function TimelineTime({
  className,
  timeStart: time,
}: {
  className: string;
  timeStart: string;
}) {
  return <div className={clsx(s.timelineTime, className)}>{time}</div>;
}

function parseTime(timestamp: number): string {
  const date = new Date(timestamp);
  return pad2Digits(date.getHours()) + pad2Digits(date.getMinutes());
}
function pad2Digits(num: number): string {
  if (num < 0) {
    return '00';
  } else if (num < 10) {
    return `0${num}`;
  } else if (num < 100) {
    return `${num}`;
  } else {
    return `99`;
  }
}
