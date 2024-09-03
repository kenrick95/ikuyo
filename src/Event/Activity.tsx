import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';
import { addActivity } from '../data/db';
import { useId } from 'react';

import Button from '@mui/material/Button';

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

export function TriggerNewActivity() {
  return <Button className={style.triggerNewForm}>Add new activity</Button>;
}

export function NewActivityForm() {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  return (
    <form
      className={style.newForm}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        if (!elForm.reportValidity()) {
          return;
        }
        const formData = new FormData(elForm);
        const title = formData.get('title')?.toString() ?? '';
        const timeStartString = formData.get('startTime')?.toString() ?? '';
        const timeEndString = formData.get('endTime')?.toString() ?? '';
        const timeStartDate = new Date(timeStartString);
        const timeEndDate = new Date(timeStartString);
        console.log('NewActivityForm', {
          title,
          startTime: timeStartDate,
          endTime: timeEndDate,
        });
        if (!title || !timeStartDate || !timeEndDate) {
          return;
        }
        if (timeStartDate > timeEndDate) {
          return;
        }
        addActivity({
          title,
          timestampStart: new Date(timeStartString).getTime(),
          timestampEnd: new Date(timeEndString).getTime(),
        });
        // TODO: Feedback new activity created
        elForm.reset();
      }}
    >
      <div className={style.newFormTitle}>Create new activity</div>
      <label className={style.newFormLabel} htmlFor={idTitle}>
        Title
      </label>
      <input
        className={style.newFormInputText}
        autoFocus
        name="title"
        type="text"
        id={idTitle}
        required
      />
      <label className={style.newFormLabel} htmlFor={idTimeStart}>
        Start time
      </label>
      <input
        className={style.newFormInputText}
        name="startTime"
        type="datetime-local"
        id={idTimeStart}
        required
      />
      <label className={style.newFormLabel} htmlFor={idTimeEnd}>
        End time
      </label>
      <input
        className={style.newFormInputText}
        name="endTime"
        type="datetime-local"
        id={idTimeEnd}
        required
      />
      <button className={style.newFormButtonSubmit} type="submit">
        Add new activity
      </button>
    </form>
  );
}
