import { ClockIcon, HomeIcon, StackIcon } from '@radix-ui/react-icons';
import { ContextMenu, Section, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import type * as React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { Route, Switch } from 'wouter';
import { Accommodation } from '../Accommodation/Accommodation';
import { AccommodationDialog } from '../Accommodation/AccommodationDialog';
import { AccommodationNewDialog } from '../Accommodation/AccommodationNewDialog';
import { Activity } from '../Activity/Activity';
import { ActivityDialog } from '../Activity/ActivityDialog';
import { ActivityNewDialog } from '../Activity/ActivityNewDialog';
import { dbUpdateActivityTime } from '../Activity/db';
import { calculateNewTimestamps } from '../Activity/dragUtils';
import {
  type DayGroups,
  groupActivitiesByDays,
} from '../Activity/eventGrouping';
import { useBoundStore } from '../data/store';
import { Macroplan } from '../Macroplan/Macroplan';
import { MacroplanDialog } from '../Macroplan/MacroplanDialog';
import { MacroplanNewDialog } from '../Macroplan/MacroplanNewDialog';
import {
  RouteTripTimetableViewAccommodation,
  RouteTripTimetableViewActivity,
  RouteTripTimetableViewMacroplan,
} from '../Routes/routes';
import { useTrip } from '../Trip/context';
import { TripViewMode } from '../Trip/TripViewMode';
import {
  generateAccommodationGridTemplateColumns,
  getAccommodationIndexes,
} from './accommodation';
import {
  generateMacroplanGridTemplateColumns,
  getMacroplanIndexes,
} from './macroplan';
import s from './Timetable.module.scss';
import { TimetableGrid } from './TimetableGrid';
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

export function Timetable() {
  const trip = useTrip();
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
  const publishToast = useBoundStore((state) => state.publishToast);
  const pushDialog = useBoundStore((state) => state.pushDialog);

  // Handle dropping activities on the timetable
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      try {
        // Get the closest grid cell where the activity was dropped
        let target = document.elementFromPoint(
          e.clientX,
          e.clientY,
        ) as HTMLElement;
        if (!target) return;

        // Get the grid position by finding the closest grid cell
        let gridCell = target.closest('[data-grid-cell]');
        let attempts = 0;

        // Try to find a grid cell by moving around the drop point
        while (!gridCell && attempts < 5) {
          attempts++;
          // Try looking at nearby points
          const offset = attempts * 10;
          const directions = [
            { x: 0, y: -offset }, // up
            { x: offset, y: 0 }, // right
            { x: 0, y: offset }, // down
            { x: -offset, y: 0 }, // left
          ];

          for (const dir of directions) {
            target = document.elementFromPoint(
              e.clientX + dir.x,
              e.clientY + dir.y,
            ) as HTMLElement;
            if (target) {
              gridCell = target.closest('[data-grid-cell]');
              if (gridCell) break;
            }
          }
        }

        if (!gridCell) {
          console.warn('No grid cell found at drop location');
          return;
        }

        const gridRow = gridCell.getAttribute('data-grid-row');
        const gridColumn = gridCell.getAttribute('data-grid-column');

        if (!gridRow || !gridColumn) {
          console.warn('Grid cell missing row or column data attributes');
          return;
        }

        // Get the activity data from the drag event
        const activityData = JSON.parse(e.dataTransfer.getData('text/plain'));
        const { activityId } = activityData;

        // Find the activity in the trip
        const activity = trip.activity.find((a) => a.id === activityId);
        if (!activity) {
          console.warn('Activity not found in trip data');
          return;
        }

        console.log('Dropping activity', {
          activityId,
          title: activity.title,
          gridRow,
          gridColumn,
        });

        // Calculate new timestamps based on the drop position
        const { timestampStart, timestampEnd } = calculateNewTimestamps(
          gridRow,
          gridColumn,
          activity,
          trip.timestampStart,
          trip.timeZone,
        );

        // Update the activity's timestamps in the database
        await dbUpdateActivityTime(activityId, timestampStart, timestampEnd);

        publishToast({
          root: {},
          title: { children: `Moved: ${activity.title}` },
          close: {},
        });
      } catch (error) {
        console.error('Error during drag and drop:', error);
        publishToast({
          root: {},
          title: { children: 'Failed to move activity' },
          close: {},
        });
      }
    },
    [trip, publishToast],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const openActivityNewDialog = useCallback(() => {
    pushDialog(ActivityNewDialog, { trip });
  }, [pushDialog, trip]);
  const openAccommodationNewDialog = useCallback(() => {
    pushDialog(AccommodationNewDialog, { trip });
  }, [pushDialog, trip]);
  const openMacroplanNewDialog = useCallback(() => {
    pushDialog(MacroplanNewDialog, { trip });
  }, [pushDialog, trip]);
  return (
    <Section py="0">
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div
            className={s.timetable}
            style={timetableStyle}
            ref={timetableRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <TimetableGrid days={dayGroups.length} />

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
                      tripViewMode={TripViewMode.List}
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
          <ContextMenu.Item onClick={openActivityNewDialog}>
            New activity
          </ContextMenu.Item>

          <ContextMenu.Item onClick={openAccommodationNewDialog}>
            New acommodation
          </ContextMenu.Item>

          <ContextMenu.Item onClick={openMacroplanNewDialog}>
            New day plan
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
      <Switch>
        <Route
          path={RouteTripTimetableViewActivity.routePath}
          component={ActivityDialog}
        />
        <Route
          path={RouteTripTimetableViewAccommodation.routePath}
          component={AccommodationDialog}
        />
        <Route
          path={RouteTripTimetableViewMacroplan.routePath}
          component={MacroplanDialog}
        />
      </Switch>
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
