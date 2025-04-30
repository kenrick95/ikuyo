import clsx from 'clsx';
import { Activity } from '../Activity/Activity';
import s from './Timetable.module.scss';

import { ContextMenu, Section, Text } from '@radix-ui/themes';

import { ClockIcon, HomeIcon, StackIcon } from '@radix-ui/react-icons';
import { useMemo, useRef } from 'react';
import { Accommodation } from '../Accommodation/Accommodation';
import {
  type DayGroups,
  groupActivitiesByDays,
} from '../Activity/eventGrouping';
import { Macroplan } from '../Macroplan/Macroplan';
import { TripViewMode } from '../Trip/TripViewMode';
import type { DbTripFull } from '../Trip/db';
import {
  generateAccommodationGridTemplateColumns,
  getAccommodationIndexes,
} from './accommodation';
import {
  generateMacroplanGridTemplateColumns,
  getMacroplanIndexes,
} from './macroplan';
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
  setNewAcommodationDialogOpen,
  setNewMacroplanDialogOpen,
}: {
  trip: DbTripFull;
  setNewActivityDialogOpen: (newValue: boolean) => void;
  setNewAcommodationDialogOpen: (newValue: boolean) => void;
  setNewMacroplanDialogOpen: (newValue: boolean) => void;
}) {
  const dayGroups = useMemo(() => groupActivitiesByDays(trip), [trip]);
  const macroplans = useMemo(() => getMacroplanIndexes(trip), [trip]);
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
  const timetableMacroplanStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateMacroplanGridTemplateColumns(dayGroups),
    };
  }, [dayGroups]);
  const timetableRef = useRef<HTMLDivElement>(null);

  return (
    <Section py="0">
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div
            className={s.timetable}
            style={timetableStyle}
            ref={timetableRef}
          >
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
            {macroplans.length > 0 ? <TimetableMacroplanHeader /> : null}
            {macroplans.length > 0 ? (
              <div className={s.macroplanGrid} style={timetableMacroplanStyle}>
                {macroplans.map(({ macroplan, day: columnIndex }) => {
                  return (
                    <Macroplan
                      key={macroplan.id}
                      macroplan={macroplan}
                      style={{
                        gridColumnStart: `d${String(
                          columnIndex.start,
                        )}-c${String(columnIndex.startColumn)}`,
                        gridColumnEnd: `d${String(columnIndex.end)}-ce${String(
                          columnIndex.endColumn,
                        )}`,
                      }}
                    />
                  );
                })}
              </div>
            ) : null}

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
                        gridColumnStart: `d${String(
                          columnIndex.start,
                        )}-c${String(columnIndex.startColumn)}`,
                        gridColumnEnd: `d${String(columnIndex.end)}-ce${String(
                          columnIndex.endColumn,
                        )}`,
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
              // TODO: what if when we create a new activity here, we prefill with the time/date of the current selection?
              // console.log(
              //   'timetable rect',
              //   timetableRef.current?.getBoundingClientRect().toJSON(),
              // );
              // {
              //   const {
              //     offsetTop,
              //     clientTop,
              //     scrollTop,
              //     offsetLeft,
              //     clientLeft,
              //     scrollLeft,
              //   } = e.currentTarget;
              //   console.log('e currentTarget', {
              //     offsetTop,
              //     clientTop,
              //     scrollTop,
              //     offsetLeft,
              //     clientLeft,
              //     scrollLeft,
              //   });
              //   console.log('e clientX clientY', e.clientX, e.clientY);
              //   console.log('e pageX pageY', e.pageX, e.pageY);
              //   console.log('e screenX screenY', e.screenX, e.screenY);
              // }
              setNewActivityDialogOpen(true);
            }}
          >
            New Activity
          </ContextMenu.Item>

          <ContextMenu.Item
            onClick={() => {
              setNewAcommodationDialogOpen(true);
            }}
          >
            New Acommodation
          </ContextMenu.Item>

          <ContextMenu.Item
            onClick={() => {
              setNewMacroplanDialogOpen(true);
            }}
          >
            New Day Plan
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

function TimetableMacroplanHeader() {
  return (
    <Text as="div" size="1" className={clsx(s.timetableMacroplanHeader)}>
      <StackIcon />
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
