import { pad2 } from './time';
import tClasses from './Timeline.module.scss';

export const timeStartMapping: Record<string, string> = {};
export const timeEndMapping: Record<string, string> = {};
export const dayStartMapping: Record<string, string> = {};
export const dayColMapping: Record<string, Record<string, string>> = {};
export const dayEndMapping: Record<string, string> = {};

export const timeColumnMapping = [
  tClasses[`t0000`],
  tClasses[`t0100`],
  tClasses[`t0200`],
  tClasses[`t0300`],
  tClasses[`t0400`],
  tClasses[`t0500`],
  tClasses[`t0600`],
  tClasses[`t0700`],
  tClasses[`t0800`],
  tClasses[`t0900`],
  tClasses[`t1000`],
  tClasses[`t1100`],
  tClasses[`t1200`],
  tClasses[`t1300`],
  tClasses[`t1400`],
  tClasses[`t1500`],
  tClasses[`t1600`],
  tClasses[`t1700`],
  tClasses[`t1800`],
  tClasses[`t1900`],
  tClasses[`t2000`],
  tClasses[`t2100`],
  tClasses[`t2200`],
  tClasses[`t2300`],
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
  dayStartMapping[i] = tClasses[`d${i}`];
  dayColMapping[i] = {};
  for (let j = 0; j < 10; j++) {
    dayColMapping[i][j] = tClasses[`d${i}-c${j}`]
  }
  dayEndMapping[i] = tClasses[`de${i}`];
}
