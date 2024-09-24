import clsx from 'clsx';
import { Activity } from '../Activity/Activity';
import s from './Timetable.module.scss';
import { DbTripWithActivity } from '../data/types';
import { ContextMenu, Section, Text } from '@radix-ui/themes';

import { useMemo } from 'react';
import {
  dayEndMapping,
  dayStartMapping,
  timeColumnMapping,
} from './TimetableStyles';
import { DayGroups, groupActivitiesByDays } from '../Activity/eventGrouping';
import { TripViewMode } from '../Trip/TripViewMode';

const times = new Array(24).fill(0).map((_, i) => {
  return (
    <TimetableTime
      className={timeColumnMapping[i]}
      timeStart={`${String(i)}:00`}
      key={i}
    />
  );
});

export function Timetable({
  trip,
  setNewActivityDialogOpen,
}: {
  trip: DbTripWithActivity;
  setNewActivityDialogOpen: (newValue: boolean) => void;
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);
  const timetableStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);
  return (
    <Section py="0">
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div className={s.timetable} style={timetableStyle}>
            <TimetableHeader />

            {dayGroups.map((dayGroup, i) => {
              return (
                <TimetableDayHeader
                  className={clsx([
                    dayStartMapping[i + 1],
                    dayEndMapping[i + 1],
                  ])}
                  dateString={dayGroup.startDateTime.toFormat(
                    `ccc, dd LLL yyyy`
                  )}
                  key={dayGroup.startDateTime.toISODate()}
                />
              );
            })}

            {times}

            {dayGroups.map((dayGroup) => {
              return Object.values(dayGroup.activities).map((activity) => {
                const columnIndex = dayGroup.activityColumnIndexMap.get(
                  activity.id
                );
                return (
                  <Activity
                    key={activity.id}
                    className={s.timetableItem}
                    activity={activity}
                    columnIndex={columnIndex?.start ?? 1}
                    columnEndIndex={columnIndex?.end ?? 1}
                    tripViewMode={TripViewMode.Timetable}
                  />
                );
              });
            })}
          </div>
        </ContextMenu.Trigger>

        <ContextMenu.Content>
          <ContextMenu.Label>{trip.title}</ContextMenu.Label>
          <ContextMenu.Item
            onClick={() => {
              setNewActivityDialogOpen(true);
            }}
          >
            New Activity
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </Section>
  );
}

function generateGridTemplateColumns(dayGroups: DayGroups): string {
  let str = `[time] 65px`;

  // Generate something like:
  // [d1 d1-c1]     360 / 1 fr
  // [de1 d2 d2-c1] 360 / 3 fr
  // [d2-c2]        360 / 3 fr
  // [d2-c3]        360 / 3 fr
  // [de2 d3 d3-c1] 360 / 1 fr
  // [de3 d4 d4-c1] 360 / 2 fr
  // [d4-c2]        360 / 2 fr
  // [de4]

  for (let dayIndex = 0; dayIndex < dayGroups.length; dayIndex++) {
    const dayGroup = dayGroups[dayIndex];
    const colWidth = `minmax(${String(90 / dayGroup.columns)}px,${String(
      360 / dayGroup.columns
    )}fr)`;
    for (let colIndex = 0; colIndex < dayGroup.columns; colIndex++) {
      const lineNames: string[] = [];
      if (dayIndex > 0) {
        lineNames.push(`de${String(dayIndex)}`);
      }
      if (colIndex === 0) {
        lineNames.push(`d${String(dayIndex + 1)}`);
      }
      lineNames.push(`d${String(dayIndex + 1)}-c${String(colIndex + 1)}`);

      str += ` [${lineNames.join(' ')}] ${colWidth}`;
    }
  }

  // Then add final "day end" line name
  str += ` [de${String(dayGroups.length - 1)}]`;

  return str;
}

function TimetableDayHeader({
  className,
  dateString,
}: {
  className: string;
  dateString: string;
}) {
  return (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={clsx(s.timetableColumn, className)}
    >
      {dateString}
    </Text>
  );
}

function TimetableHeader() {
  return (
    <Text as="div" size="1" className={clsx(s.timetableHeader)}>
      Time\Day
    </Text>
  );
}
function TimetableTime({
  className,
  timeStart: time,
}: {
  className: string[];
  timeStart: string;
}) {
  return (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={clsx(s.timetableTime, className)}
    >
      {time}
    </Text>
  );
}
