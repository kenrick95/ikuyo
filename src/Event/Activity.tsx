import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';

const timeStartMapping: Record<string, string> = {};
const timeEndMapping: Record<string, string> = {};

function pad2(num: number): string {
  if (num >= 10) {
    return `${num}`;
  }
  return `0${num}`;
}
for (let i = 0; i < 24; i++) {
  const hh = pad2(i);
  for (let j = 0; j < 60; j++) {
    const mm = pad2(j);
    timeStartMapping[`${hh}${mm}`] = tClasses[`t${hh}${mm}`];
    timeEndMapping[`${hh}${mm}`] = tClasses[`te${hh}${mm}`];
  }
}

export function Activity({
  title,
  className,
  timeStart,
  timeEnd,
}: {
  title: string;
  className?: string;
  timeStart: string;
  timeEnd: string;
}) {
  return (
    <div
      className={clsx(
        style.activity,
        timeStartMapping[timeStart],
        timeEndMapping[timeEnd],
        className
      )}
    >
      Activity: {title}
    </div>
  );
}
