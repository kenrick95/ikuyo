import clsx from 'clsx';
import { Activity } from './Activity';
import style from './Timeline.module.css';
import tClasses from './Timeline.module.scss';

const timeClassMapping = [
  tClasses.t0000,
  tClasses.t0100,
  tClasses.t0200,
  tClasses.t0300,
  tClasses.t0400,
  tClasses.t0500,
  tClasses.t0600,
  tClasses.t0700,
  tClasses.t0800,
  tClasses.t0900,
  tClasses.t1000,
  tClasses.t1100,
  tClasses.t1200,
  tClasses.t1300,
  tClasses.t1400,
  tClasses.t1500,
  tClasses.t1600,
  tClasses.t1700,
  tClasses.t1800,
  tClasses.t1900,
  tClasses.t2000,
  tClasses.t2100,
  tClasses.t2200,
  tClasses.t2300,
];
const times = new Array(24).fill(0).map((_, i) => {
  return (
    <TimelineTime className={timeClassMapping[i]} time={`${i}:00`} key={i} />
  );
});

export function Timeline() {
  return (
    <div className={tClasses.timeline}>
      {times}
      <Activity className={style.timelineItem} title="Hotel" />
      <Activity className={style.timelineItem} title="Breakfast" />
      <Activity className={style.timelineItem} title="Walk" />
      <Activity className={style.timelineItem} title="Lunch" />
      <Activity className={style.timelineItem} title="Aquarium" />
      <Activity className={style.timelineItem} title="Something" />
      <Activity className={style.timelineItem} title="Zoo" />
      <Activity className={style.timelineItem} title="Dinner" />
      <Activity className={style.timelineItem} title="Museum" />
      <Activity className={style.timelineItem} title="Nightclub" />
      <Activity className={style.timelineItem} title="Hotel" />
    </div>
  );
}

function TimelineTime({
  className,
  time,
}: {
  className: string;
  time: string;
}) {
  return <div className={clsx(style.timelineTime, className)}>{time}</div>;
}
