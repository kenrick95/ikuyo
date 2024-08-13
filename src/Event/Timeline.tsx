import clsx from 'clsx';
import { Activity } from './Activity';
import s from './Timeline.module.scss';

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

export function Timeline() {
  return (
    <div className={s.timeline}>
      {times}
      <Activity
        className={s.timelineItem}
        // Hmmm, it's very error prone to type this 0000, 0800
        timeStart="0000"
        timeEnd="0800"
        title="Hotel"
      />
      <Activity
        className={s.timelineItem}
        timeStart="0800"
        timeEnd="0900"
        title="Breakfast"
      />
      <Activity
        className={s.timelineItem}
        timeStart="0900"
        timeEnd="0930"
        title="Walk"
      />
      <Activity
        className={s.timelineItem}
        timeStart="1145"
        timeEnd="1235"
        title="Lunch"
      />
      <Activity
        className={s.timelineItem}
        timeStart="1245"
        timeEnd="1400"
        title="Aquarium"
      />
      <Activity
        timeStart="1434"
        timeEnd="1800"
        className={s.timelineItem}
        title="Zoo"
      />
      {/* Interesting... if overlap, CSS grid will show it to the next column */}
      <Activity
        className={s.timelineItem}
        timeStart="1723"
        timeEnd="1859"
        title="Dinner"
      />
      <Activity
        className={s.timelineItem}
        timeStart="1900"
        timeEnd="2123"
        title="Museum"
      />
      <Activity
        className={s.timelineItem}
        timeStart="2200"
        timeEnd="2300"
        title="Nightclub"
      />
      <Activity
        className={s.timelineItem}
        timeStart="2300"
        timeEnd="2359"
        title="Hotel"
      />
    </div>
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
