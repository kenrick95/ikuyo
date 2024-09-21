import { pad2 } from './time';
import './TimelineTimes.scss';

export const timeStartMapping: Record<string, string> = {};
export const timeEndMapping: Record<string, string> = {};
export const dayStartMapping: Record<string, string> = {};
export const dayColMapping: Record<string, Record<string, string>> = {};
export const dayEndMapping: Record<string, string> = {};

export const timeColumnMapping = [
  [`t0000`, `te0059`],
  [`t0100`, `te0159`],
  [`t0200`, `te0259`],
  [`t0300`, `te0359`],
  [`t0400`, `te0459`],
  [`t0500`, `te0559`],
  [`t0600`, `te0659`],
  [`t0700`, `te0759`],
  [`t0800`, `te0859`],
  [`t0900`, `te0959`],
  [`t1000`, `te1059`],
  [`t1100`, `te1159`],
  [`t1200`, `te1259`],
  [`t1300`, `te1359`],
  [`t1400`, `te1459`],
  [`t1500`, `te1559`],
  [`t1600`, `te1659`],
  [`t1700`, `te1759`],
  [`t1800`, `te1859`],
  [`t1900`, `te1959`],
  [`t2000`, `te2059`],
  [`t2100`, `te2159`],
  [`t2200`, `te2259`],
  [`t2300`, `te2359`],
];
for (let i = 0; i < 24; i++) {
  const hh = pad2(i);
  for (let j = 0; j < 60; j++) {
    const mm = pad2(j);
    timeStartMapping[`${hh}${mm}`] = `t${hh}${mm}`;
    timeEndMapping[`${hh}${mm}`] = `te${hh}${mm}`;
  }
}
for (let i = 0; i < 30; i++) {
  dayStartMapping[i] = `d${String(i)}`;
  dayColMapping[i] = {};
  for (let j = 0; j < 10; j++) {
    dayColMapping[i][j] = `d${String(i)}-c${String(j)}`;
  }
  dayEndMapping[i] = `de${String(i)}`;
}
