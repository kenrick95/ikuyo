import clsx from 'clsx';
import { Activity } from './Activity';
import s from './Timeline.module.scss';
import { DbActivityWithTrip, DbTripWithActivity } from '../data/types';
import { ContextMenu, Section, Text } from '@radix-ui/themes';

import { DateTime } from 'luxon';
import { useMemo } from 'react';
import {
  dayEndMapping,
  dayStartMapping,
  timeColumnMapping,
} from './TimelineStyles';

const times = new Array(24).fill(0).map((_, i) => {
  return (
    <TimelineTime
      className={timeColumnMapping[i]}
      timeStart={`${String(i)}:00`}
      key={i}
    />
  );
});

export function Timeline({
  trip,
  setNewActivityDialogOpen,
}: {
  trip: DbTripWithActivity;
  setNewActivityDialogOpen: (newValue: boolean) => void;
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);
  const timelineStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);
  return (
    <Section py="0">
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div className={s.timeline} style={timelineStyle}>
            <TimelineHeader />

            {dayGroups.map((dayGroup, i) => {
              return (
                <TimelineDayHeader
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
                return (
                  <Activity
                    key={activity.id}
                    className={s.timelineItem}
                    activity={activity}
                    columnIndex={
                      dayGroup.activityColumnIndexMap.get(activity.id) ?? 1
                    }
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

type DayGroups = Array<{
  /** DateTime in trip time zone */
  startDateTime: DateTime;
  columns: number;
  activities: DbActivityWithTrip[];
  activityColumnIndexMap: Map<string, number>;
}>;

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
    const colWidth = `minmax(${String(90 / dayGroup.columns)}px,${String(360 / dayGroup.columns)}fr)`;
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

function TimelineDayHeader({
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
      className={clsx(s.timelineColumn, className)}
    >
      {dateString}
    </Text>
  );
}

function TimelineHeader() {
  return (
    <Text
      as="div"
      size="1"
      className={clsx(s.timelineHeader)}
    >
      Time\Day
    </Text>
  );
}
function TimelineTime({
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
      className={clsx(s.timelineTime, className)}
    >
      {time}
    </Text>
  );
}

/** Return `DateTime` objects for each of day in the trip */
function groupActivitiesByDays(trip: DbTripWithActivity): DayGroups {
  const res: DayGroups = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone
  );
  const tripDuration = tripEndDateTime.diff(tripStartDateTime, 'days');
  for (let d = 0; d < tripDuration.days; d++) {
    const dayStartDateTime = tripStartDateTime.plus({ day: d });
    const dayEndDateTime = tripStartDateTime.plus({ day: d + 1 });
    const dayActivities: DbActivityWithTrip[] = [];
    /** activity id --> column index */
    const activityColumnIndexMap: Map<string, number> = new Map();
    for (const activity of trip.activity) {
      activityColumnIndexMap.set(activity.id, 1);
      const activityStartDateTime = DateTime.fromMillis(
        activity.timestampStart
      ).setZone(trip.timeZone);
      const activityEndDateTime = DateTime.fromMillis(
        activity.timestampEnd
      ).setZone(trip.timeZone);
      if (
        dayStartDateTime <= activityStartDateTime &&
        activityEndDateTime <= dayEndDateTime
      ) {
        dayActivities.push(activity);
      }
    }

    // Finding max overlaps: https://stackoverflow.com/a/46532590/917957
    enum Token {
      Start,
      End,
    }
    const ranges: Array<[number, Token, string]> = [];
    for (const activity of dayActivities) {
      ranges.push([activity.timestampStart, Token.Start, activity.id]);
      // "End" is half a millisecond before start so that we don't count event that ends at exact time as next start one as overlapping
      ranges.push([activity.timestampEnd - 0.5, Token.End, activity.id]);
    }
    ranges.sort((a, b) => {
      // Sort by time, if tie, break by Start first then End
      if (a[0] === b[0]) {
        return a[1] - b[1];
      }
      return a[0] - b[0];
    });
    let maxOverlaps = 0;
    let overlaps = 0;
    for (const range of ranges) {
      if (range[1] === Token.Start) {
        overlaps += 1;
      } else {
        overlaps -= 1;
      }
      activityColumnIndexMap.set(range[2], overlaps + 1);
      maxOverlaps = Math.max(overlaps, maxOverlaps);
    }

    res.push({
      startDateTime: dayStartDateTime,
      columns: Math.max(maxOverlaps, 1),
      activities: dayActivities,
      activityColumnIndexMap,
    });
  }

  return res;
}
