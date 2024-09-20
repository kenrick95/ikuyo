import { pad2 } from './time';
import tClasses from './Timeline.module.scss';

export const timeStartMapping: Record<string, string> = {};
export const timeEndMapping: Record<string, string> = {};
export const dayStartMapping: Record<string, string> = {};
export const dayColMapping: Record<string, Record<string, string>> = {};
export const dayEndMapping: Record<string, string> = {};

export const timeColumnMapping = [
  [tClasses[`t0000`], tClasses[`te0059`]],
  [tClasses[`t0100`], tClasses[`te0159`]],
  [tClasses[`t0200`], tClasses[`te0259`]],
  [tClasses[`t0300`], tClasses[`te0359`]],
  [tClasses[`t0400`], tClasses[`te0459`]],
  [tClasses[`t0500`], tClasses[`te0559`]],
  [tClasses[`t0600`], tClasses[`te0659`]],
  [tClasses[`t0700`], tClasses[`te0759`]],
  [tClasses[`t0800`], tClasses[`te0859`]],
  [tClasses[`t0900`], tClasses[`te0959`]],
  [tClasses[`t1000`], tClasses[`te1059`]],
  [tClasses[`t1100`], tClasses[`te1159`]],
  [tClasses[`t1200`], tClasses[`te1259`]],
  [tClasses[`t1300`], tClasses[`te1359`]],
  [tClasses[`t1400`], tClasses[`te1459`]],
  [tClasses[`t1500`], tClasses[`te1559`]],
  [tClasses[`t1600`], tClasses[`te1659`]],
  [tClasses[`t1700`], tClasses[`te1759`]],
  [tClasses[`t1800`], tClasses[`te1859`]],
  [tClasses[`t1900`], tClasses[`te1959`]],
  [tClasses[`t2000`], tClasses[`te2059`]],
  [tClasses[`t2100`], tClasses[`te2159`]],
  [tClasses[`t2200`], tClasses[`te2259`]],
  [tClasses[`t2300`], tClasses[`te2359`]],
];
for (let i = 0; i < 24; i++) {
  const hh = pad2(i);
  for (let j = 0; j < 60; j++) {
    const mm = pad2(j);
    timeStartMapping[`${hh}${mm}`] = tClasses[`t${hh}${mm}`];
    timeEndMapping[`${hh}${mm}`] = tClasses[`te${hh}${mm}`];
  }
}
for (let i = 0; i < 30; i++) {
  dayStartMapping[i] = tClasses[`d${String(i)}`];
  dayColMapping[i] = {};
  for (let j = 0; j < 10; j++) {
    dayColMapping[i][j] = tClasses[`d${String(i)}-c${String(j)}`];
  }
  dayEndMapping[i] = tClasses[`de${String(i)}`];
}
