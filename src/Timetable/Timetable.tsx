import clsx from 'clsx';
import { Activity } from '../Activity/Activity';
import s from './Timetable.module.scss';

import { ContextMenu, Section, Text } from '@radix-ui/themes';

import { ClockIcon, HomeIcon } from '@radix-ui/react-icons';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { Accommodation } from '../Accommodation/Accommodation';
import type { DbAccommodationWithTrip } from '../Accommodation/db';
import {
  type DayGroups,
  groupActivitiesByDays,
} from '../Activity/eventGrouping';
import { TripViewMode } from '../Trip/TripViewMode';
import type {
  DbTripWithAccommodation,
  DbTripWithActivityAccommodation,
} from '../Trip/db';
import { pad2 } from './time';

const times = new Array(24).fill(0).map((_, i) => {
  return (
    <TimetableTime
      timeStart={`${pad2(i)}:00`}
      key={`${pad2(i)}:00`}
      style={{
        gridRowStart: `t${pad2(i)}00`,
      }}
    />
  );
});

export function Timetable({
  trip,
  setNewActivityDialogOpen,
}: {
  trip: DbTripWithActivityAccommodation;
  setNewActivityDialogOpen: (newValue: boolean) => void;
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);
  const acommodations = useMemo(() => getAccommodationIndexes(trip), [trip]);

  const timetableStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateMainGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);
  const timetableAccommodationStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateAccommodationGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);

  return (
    <Section py="0">
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div className={s.timetable} style={timetableStyle}>
            <TimetableTimeHeader />

            {dayGroups.map((dayGroup, i) => {
              return (
                <TimetableDayHeader
                  dateString={dayGroup.startDateTime.toFormat(
                    'ccc, dd LLL yyyy',
                  )}
                  key={dayGroup.startDateTime.toISODate()}
                  style={{
                    gridColumnStart: `d${String(i + 1)}`,
                    gridColumnEnd: `de${String(i + 1)}`,
                  }}
                />
              );
            })}
            {acommodations.length > 0 ? <TimetableAccommodationHeader /> : null}

            {acommodations.length > 0 ? (
              <div
                className={s.accommodationGrid}
                style={timetableAccommodationStyle}
              >
                {acommodations.map(({ accommodation, day: columnIndex }) => {
                  return (
                    <Accommodation
                      key={accommodation.id}
                      accommodation={accommodation}
                      tripViewMode={TripViewMode.Timetable}
                      style={{
                        gridColumnStart: `d${String(columnIndex.start)}-c${String(columnIndex.startColumn)}`,
                        gridColumnEnd: `d${String(columnIndex.end)}-ce${String(columnIndex.endColumn)}`,
                      }}
                    />
                  );
                })}
              </div>
            ) : null}

            {times}

            {dayGroups.map((dayGroup) => {
              return Object.values(dayGroup.activities).map((activity) => {
                const columnIndex = dayGroup.activityColumnIndexMap.get(
                  activity.id,
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

function generateMainGridTemplateColumns(dayGroups: DayGroups): string {
  let str = '[time] 45px';

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
    const colWidth = `minmax(${String(120 / dayGroup.columns)}px,${String(
      360 / dayGroup.columns,
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
  str += ` [de${String(dayGroups.length)}]`;

  return str;
}

function generateAccommodationGridTemplateColumns(
  dayGroups: DayGroups,
): string {
  let str = '';

  // 1 day always have 2 columns
  // Generate something like:
  // [d1-c1]     360 / 2 fr
  // [d1-ce1 d1-c2] 360 / 2 fr
  // [d1-ce2 d2-c1] 360 / 2 fr
  // [d2-ce1 d2-c2] 360 / 2 fr
  // [d2-ce2 d3-c1] 360 / 2 fr
  // [d3-ce1 d3-c2] 360 / 2 fr
  // [d3-ce2 d4-c1] 360 / 2 fr
  // [d4-ce1 d4-c2] 360 / 2 fr
  // [d4-ce2]

  const maxColumns = 2;
  for (let dayIndex = 0; dayIndex < dayGroups.length; dayIndex++) {
    const colWidth = `minmax(${String(120 / 2)}px,${String(360 / 2)}fr)`;
    for (let colIndex = 0; colIndex < maxColumns; colIndex++) {
      const lineNames: string[] = [];
      if (colIndex === 0 && dayIndex > 0) {
        lineNames.push(`d${String(dayIndex)}-ce${String(maxColumns)}`);
      }
      if (colIndex > 0) {
        lineNames.push(`d${String(dayIndex + 1)}-ce${String(colIndex)}`);
      }

      lineNames.push(`d${String(dayIndex + 1)}-c${String(colIndex + 1)}`);

      str += ` [${lineNames.join(' ')}] ${colWidth}`;
    }
  }

  str += ` [d${String(dayGroups.length)}-ce${String(maxColumns)}]`;

  return str;
}

function TimetableDayHeader({
  dateString,
  style,
}: {
  dateString: string;
  style: React.CSSProperties;
}) {
  return (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={s.timetableColumn}
      style={style}
    >
      {dateString}
    </Text>
  );
}

function TimetableAccommodationHeader() {
  return (
    <Text as="div" size="1" className={clsx(s.timetableAccommodationHeader)}>
      <HomeIcon />
    </Text>
  );
}
function TimetableTimeHeader() {
  return (
    <Text as="div" size="1" className={clsx(s.timetableTimeHeader)}>
      <ClockIcon />
    </Text>
  );
}
function TimetableTime({
  timeStart: time,
  style,
}: {
  timeStart: string;
  style: React.CSSProperties;
}) {
  return (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={s.timetableTime}
      style={style}
    >
      {time}
    </Text>
  );
}

function getAccommodationIndexes(trip: DbTripWithAccommodation) {
  const res: Array<{
    accommodation: DbAccommodationWithTrip;
    day: {
      start: number;
      end: number;
      startColumn: number;
      endColumn: number | undefined;
    };
  }> = [];
  const tripStartDateTime = DateTime.fromMillis(trip.timestampStart).setZone(
    trip.timeZone,
  );
  const tripEndDateTime = DateTime.fromMillis(trip.timestampEnd).setZone(
    trip.timeZone,
  );
  const tripEndDay = tripEndDateTime.diff(tripStartDateTime, 'days').days;

  for (const accommodation of trip.accommodation) {
    const accommodationCheckInDateTime = DateTime.fromMillis(
      accommodation.timestampCheckIn,
    ).setZone(trip.timeZone);
    const accommodationCheckInDay =
      accommodationCheckInDateTime
        .startOf('day')
        .diff(tripStartDateTime, 'days').days + 1;
    const accommodationCheckOutDateTime = DateTime.fromMillis(
      accommodation.timestampCheckOut,
    ).setZone(trip.timeZone);
    const accommodationCheckOutDay =
      accommodationCheckOutDateTime
        .startOf('day')
        .diff(tripStartDateTime, 'days').days + 1;

    res.push({
      accommodation,
      day: {
        start: accommodationCheckInDay,
        end: accommodationCheckOutDay,
        startColumn: accommodationCheckInDay === 1 ? 1 : 2,
        endColumn: accommodationCheckOutDay === tripEndDay ? 2 : 1,
      },
    });
  }

  return res;
}
