import {
  ClockIcon,
  EyeClosedIcon,
  EyeOpenIcon,
  HomeIcon,
  StackIcon,
} from '@radix-ui/react-icons';
import {
  ContextMenu,
  IconButton,
  Section,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import clsx from 'clsx';

import type * as React from 'react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Route, Switch } from 'wouter';
import { Accommodation } from '../../Accommodation/Accommodation';
import { AccommodationDialog } from '../../Accommodation/AccommodationDialog/AccommodationDialog';
import { AccommodationNewDialog } from '../../Accommodation/AccommodationNewDialog';
import { Activity } from '../../Activity/Activity';
import { ActivityDialog } from '../../Activity/ActivityDialog/ActivityDialog';
import { ActivityNewDialog } from '../../Activity/ActivityNewDialog';
import {
  dbDuplicateActivityDragEnd,
  dbUpdateActivityDragEnd,
} from '../../Activity/db';
import { calculateNewTimestamps } from '../../Activity/dragUtils';
import {
  type DayGroups,
  groupActivitiesByDays,
} from '../../Activity/eventGrouping';
import { toFormat } from '../../common/dateTime/temporalFormatter';
import { useBoundStore } from '../../data/store';
import { Macroplan } from '../../Macroplan/Macroplan';
import { MacroplanDialog } from '../../Macroplan/MacroplanDialog/MacroplanDialog';
import { MacroplanNewDialog } from '../../Macroplan/MacroplanNewDialog';
import { DocTitle } from '../../Nav/DocTitle';
import {
  RouteTripTimetableViewAccommodation,
  RouteTripTimetableViewActivity,
  RouteTripTimetableViewMacroplan,
} from '../../Routes/routes';
import { TripUserRole } from '../../User/TripUserRole';
import { IdeaSidebar } from '../Ideas/IdeaSidebar';
import {
  useCurrentTrip,
  useTripAccommodations,
  useTripActivities,
  useTripMacroplans,
  useTripTimetableDragging,
} from '../store/hooks';
import type { TripSliceActivity, TripSliceTrip } from '../store/types';
import { TripViewMode } from '../TripViewMode';
import {
  generateAccommodationGridTemplateColumns,
  getAccommodationIndexes,
} from './accommodation';
import {
  generateMacroplanGridTemplateColumns,
  getMacroplanIndexes,
} from './macroplan';
import { SwapDayDialog } from './SwapDay/SwapDayDialog';
import s from './Timetable.module.scss';
import { TimetableDialogState } from './TimetableDialogState';
import { TimetableGrid } from './TimetableGrid';
import { pad2 } from './time';

const TimetableTime = memo(TimetableTimeInner, (prevProps, nextProps) => {
  return (
    prevProps.timeStart === nextProps.timeStart &&
    prevProps.gridRowStart === nextProps.gridRowStart
  );
});

const times = new Array(24).fill(0);

export function Timetable() {
  const { trip } = useCurrentTrip();
  const activities = useTripActivities(trip?.activityIds ?? []);
  const tripAccommodations = useTripAccommodations(
    trip?.accommodationIds ?? [],
  );
  const tripMacroplans = useTripMacroplans(trip?.macroplanIds ?? []);

  const dayGroups = useMemo(() => {
    if (!trip || !activities || !tripAccommodations || !tripMacroplans)
      return {
        inTrip: [],
        ideas: {
          activities: [],
          accommodations: [],
          macroplans: [],
        },
      } satisfies DayGroups;
    return groupActivitiesByDays({
      trip,
      activities,
      accommodations: tripAccommodations,
      macroplans: tripMacroplans,
    });
  }, [trip, activities, tripAccommodations, tripMacroplans]);
  const macroplans = useMemo(() => {
    if (!trip) return [];
    return getMacroplanIndexes({ trip, macroplans: tripMacroplans });
  }, [trip, tripMacroplans]);
  const acommodations = useMemo(() => {
    if (!trip) return [];
    return getAccommodationIndexes({
      trip,
      accommodations: tripAccommodations,
    });
  }, [trip, tripAccommodations]);
  const { timetableDragging, setTimetableDragging } =
    useTripTimetableDragging();

  // Hide sidebar initially on small screens
  const initialWindowWidth = useMemo(() => {
    return window.innerWidth;
  }, []);
  const [isSidebarVisible, setSidebarVisible] = useState<boolean>(
    initialWindowWidth > 768,
  );

  const ideasCount =
    dayGroups.ideas.activities.length +
    dayGroups.ideas.accommodations.length +
    dayGroups.ideas.macroplans.length;

  const isUsingClampedTable = dayGroups.inTrip.length < 5;
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
  const resetToast = useBoundStore((state) => state.resetToast);

  // State to track if we've already scrolled for this trip to prevent repeated scrolling
  const [hasScrolledForTrip, setHasScrolledForTrip] = useState<string | null>(
    null,
  );

  /** Current day number (1-based) */
  const currentDayIndex = useMemo(() => {
    if (!trip?.timeZone || !trip?.timestampStart || !trip?.timestampEnd) {
      return null;
    }

    const tripStartDateTime = Temporal.Instant.fromEpochMilliseconds(
      trip.timestampStart,
    ).toZonedDateTimeISO(trip.timeZone);
    const tripEndDateTime = Temporal.Instant.fromEpochMilliseconds(
      trip.timestampEnd,
    ).toZonedDateTimeISO(trip.timeZone);
    const nowInTripTimeZone = Temporal.Now.zonedDateTimeISO(trip.timeZone);

    if (
      Temporal.ZonedDateTime.compare(nowInTripTimeZone, tripStartDateTime) <
        0 ||
      Temporal.ZonedDateTime.compare(nowInTripTimeZone, tripEndDateTime) > 0
    ) {
      return null;
    }

    const currentDay =
      Math.floor(
        nowInTripTimeZone.since(tripStartDateTime.startOfDay(), {
          largestUnit: 'days',
        }).days,
      ) + 1;

    // Ensure the current day is within the valid range (1-based index)
    const clampedDay = Math.max(
      1,
      Math.min(currentDay, dayGroups.inTrip.length),
    );

    return clampedDay;
  }, [trip, dayGroups.inTrip.length]);

  const timetableStyle = useMemo(() => {
    return {
      gridTemplateColumns: generateMainGridTemplateColumns(dayGroups),
      '--day-count': dayGroups.inTrip.length,
      '--current-day': currentDayIndex || 0,
    };
  }, [dayGroups, currentDayIndex]);

  // Auto-scroll to current day and hour when trip is in progress
  useLayoutEffect(() => {
    if (
      currentDayIndex == null ||
      trip?.timeZone == null ||
      trip?.id == null ||
      !timetableRef.current
    ) {
      return;
    }
    // Check if we've already scrolled for this trip
    if (hasScrolledForTrip === trip.id) {
      return;
    }

    const now = Temporal.Now.zonedDateTimeISO(trip.timeZone);
    const currentHour = now.hour;

    // Delay scroll to ensure elements are rendered
    const scrollToPosition = () => {
      if (!timetableRef.current) return;

      let targetElement = null;
      // Find a grid cell for the current day and hour (look for the first column of the day)
      const currentDayGridCell = timetableRef.current.querySelector(
        `[data-grid-column="d${currentDayIndex}-c1"][data-grid-row="t${currentHour.toString().padStart(2, '0')}00"]`,
      );
      if (currentDayGridCell) {
        targetElement = currentDayGridCell;
      } else {
        // Fallback: look for any cell in the current day if the exact hour doesn't exist
        const fallbackDayCell = timetableRef.current.querySelector(
          `[data-grid-column="d${currentDayIndex}-c1"]`,
        );
        if (fallbackDayCell) {
          targetElement = fallbackDayCell;
        } else {
          // Fallback: look for any cell at the current hour if the day doesn't exist
          const fallbackHourCell = timetableRef.current.querySelector(
            `[data-grid-row="t${currentHour.toString().padStart(2, '0')}00"]`,
          );

          if (fallbackHourCell) {
            targetElement = fallbackHourCell;
          }
        }
      }

      if (targetElement) {
        const targetRect = targetElement.getBoundingClientRect();
        const containerRect = timetableRef.current.getBoundingClientRect();

        // Calculate scroll positions to center the target element
        const scrollLeft =
          timetableRef.current.scrollLeft +
          targetRect.left -
          containerRect.left -
          containerRect.width / 3;
        const scrollTop =
          timetableRef.current.scrollTop +
          targetRect.top -
          containerRect.top -
          containerRect.height / 3;

        // Smooth scroll to the current position
        timetableRef.current.scrollTo({
          left: Math.max(0, scrollLeft),
          top: Math.max(0, scrollTop),
          behavior: 'smooth',
        });
        setHasScrolledForTrip(trip.id); // Mark that we have scrolled
      }
    };

    // Small delay to ensure all elements are rendered
    const timeoutId = setTimeout(scrollToPosition, 100);
    return () => clearTimeout(timeoutId);
  }, [trip?.timeZone, trip?.id, currentDayIndex, hasScrolledForTrip]);

  // Reset scroll state when trip changes
  useEffect(() => {
    if (trip && hasScrolledForTrip && hasScrolledForTrip !== trip.id) {
      setHasScrolledForTrip(null);
    }
  }, [trip, hasScrolledForTrip]);

  const userCanModifyTrip = useMemo(() => {
    return (
      trip?.archivedAt == null &&
      (trip?.currentUserRole === TripUserRole.Owner ||
        trip?.currentUserRole === TripUserRole.Editor)
    );
  }, [trip]);

  // Days available for the day-swap context menu (derived once, not per header).
  const tripDays = useMemo(() => {
    return trip ? dayGroupsFromTrip(trip) : [];
  }, [trip]);

  // Handle dropping activities on the timetable
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setTimetableDragging(false, undefined);
      if (!trip) {
        console.warn('No trip found for dropping activity');
        return;
      }
      if (!userCanModifyTrip) {
        console.warn(
          'User does not have permission to edit or delete activities',
        );
        publishToast({
          root: {},
          title: { children: 'You do not have permission to move activities' },
          close: {},
        });
        return;
      }

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
        const activityData = JSON.parse(
          e.dataTransfer.getData('text/plain'),
        ) as {
          activityId: string;
          mode: 'drag' | 'resize';
          originalTimeStart: string;
          originalTimeEnd: string;
          originalDayStart: number;
        };
        const { activityId, mode } = activityData;

        // Find the activity in the trip
        const activity = activities.find((a) => a.id === activityId);
        if (!activity) {
          console.warn('Activity not found in trip data');
          return;
        }

        const isCopying = e.altKey || e.ctrlKey;
        console.log('Dropping activity', {
          activityId,
          title: activity.title,
          gridRow,
          gridColumn,
          activityData,
          isCopying,
          altKeyPressed: e.altKey,
          ctrlKeyPressed: e.ctrlKey,
        });

        // Calculate new timestamps based on the drop position
        const { timestampStart, timestampEnd, error } = calculateNewTimestamps(
          gridRow,
          gridColumn,
          activity,
          trip.timestampStart,
          trip.timeZone,
          mode,
        );

        if (error) {
          console.warn('Error calculating new timestamps:', error);
          publishToast({
            root: {},
            title: {
              children: `Failed to ${mode === 'drag' ? 'move' : 'change end time of'} activity: ${error}`,
            },
            close: {},
          });
          return;
        }

        // Handle if timestamp is the same
        if (
          activity.timestampStart === timestampStart &&
          activity.timestampEnd === timestampEnd
        ) {
          console.log('Activity dropped in the same position, no changes made');
          return;
        }

        if (isCopying) {
          // Copy activity instead of move/resize
          const { undo } = await dbDuplicateActivityDragEnd(activityId, {
            timestampStart,
            timestampEnd,
          });

          resetToast();
          publishToast({
            root: { duration: 15_000 },
            title: { children: `Copied activity ${activity.title}` },
            action: {
              children: 'Undo',
              altText: `Undo the copy of ${activity.title}`,
              onClick: async () => {
                await undo();
                resetToast();
                publishToast({
                  root: {},
                  title: { children: `Undone copy of ${activity.title}` },
                  close: {},
                });
              },
            },
            close: {},
          });
          return;
        } else {
          // Update the activity's timestamps in the database
          const { undo } = await dbUpdateActivityDragEnd(activityId, {
            timestampStart,
            timestampEnd,
          });
          resetToast();
          publishToast({
            root: { duration: 15_000 },
            title: {
              children: `${mode === 'drag' ? 'Moved' : 'End time changed'} for activity ${activity.title}`,
            },
            action: {
              children: 'Undo',
              altText: `Undo ${mode === 'drag' ? 'the move' : 'the end time change'} of ${activity.title}`,
              onClick: async () => {
                await undo();
                resetToast();
                publishToast({
                  root: {},
                  title: {
                    children: `Undone ${mode === 'drag' ? 'the move' : 'the end time change'} of ${activity.title}`,
                  },
                  close: {},
                });
              },
            },
            close: {},
          });
        }
      } catch (error) {
        console.error('Error during drag and drop:', error);
        publishToast({
          root: {},
          title: { children: 'Failed to move activity' },
          close: {},
        });
      }
    },
    [
      trip,
      activities,
      publishToast,
      resetToast,
      userCanModifyTrip,
      setTimetableDragging,
    ],
  );
  const toggleSidebar = useCallback(() => {
    setSidebarVisible(!isSidebarVisible);
  }, [isSidebarVisible]);

  const pushDialog = useBoundStore((state) => state.pushDialog);
  useEffect(() => {
    if (!trip) return;
    const dialogState = history.state?.dialog as
      | TimetableDialogState
      | undefined;
    if (dialogState === TimetableDialogState.ActivityNew) {
      pushDialog(ActivityNewDialog, { trip });
    } else if (dialogState === TimetableDialogState.AccommodationNew) {
      pushDialog(AccommodationNewDialog, { trip });
    } else if (dialogState === TimetableDialogState.MacroplanNew) {
      pushDialog(MacroplanNewDialog, { trip });
    }
    // Immediately clear the dialog state from history to prevent it from unable to close dialog
    history.replaceState(
      { ...history.state, dialog: undefined },
      '',
      window.location.href,
    );
  }, [pushDialog, trip]);

  return (
    <Section py="0">
      <DocTitle title={`${trip?.title ?? 'Trip'} - Timetable`} />
      {/** biome-ignore lint/a11y/noStaticElementInteractions: Only drag-and-drop */}
      <div
        className={clsx(
          s.timetable,
          timetableDragging.dragging && s.dragging,
          isUsingClampedTable && s.timetableClamped,
        )}
        style={timetableStyle}
        ref={timetableRef}
        onDrop={handleDrop}
      >
        <TimetableGrid
          days={dayGroups.inTrip.length}
          scrollContainerRef={timetableRef}
        />
        <TimetableTimeHeader />
        {dayGroups.inTrip.map((dayGroup, i) => {
          const dayNumber = i + 1;
          const isCurrentDay = currentDayIndex === dayNumber;
          return (
            <TimetableDayHeader
              dateString={toFormat('ccc, d LLL yyyy', dayGroup.startDateTime)}
              key={dayGroup.startDateTime.toString()}
              gridColumnStart={`d${String(dayNumber)}`}
              gridColumnEnd={`de${String(dayNumber)}`}
              isActive={isCurrentDay}
              dayIndex={i}
              userCanModifyTrip={userCanModifyTrip}
              trip={trip}
              activities={activities}
              tripDays={tripDays}
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
                  gridColumnStart={`d${String(
                    columnIndex.start,
                  )}-c${String(columnIndex.startColumn)}`}
                  gridColumnEnd={`d${String(columnIndex.end)}-ce${String(
                    columnIndex.endColumn,
                  )}`}
                  userCanEditOrDelete={userCanModifyTrip}
                  index={-1}
                />
              );
            })}
          </div>
        ) : null}
        {acommodations.length > 0 ? <TimetableAccommodationHeader /> : null}
        {trip && acommodations.length > 0 ? (
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
                  gridColumnStart={`d${String(
                    columnIndex.start,
                  )}-c${String(columnIndex.startColumn)}`}
                  gridColumnEnd={`d${String(columnIndex.end)}-ce${String(
                    columnIndex.endColumn,
                  )}`}
                  timeZone={trip.timeZone}
                  userCanEditOrDelete={userCanModifyTrip}
                />
              );
            })}
          </div>
        ) : null}
        {times.map((_, i) => {
          return (
            <TimetableTime
              timeStart={`${pad2(i)}:00`}
              key={`${pad2(i)}:00`}
              gridRowStart={`t${pad2(i)}00`}
            />
          );
        })}
        {dayGroups.inTrip.map((dayGroup) => {
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
                tripTimeZone={trip?.timeZone ?? ''}
                tripTimestampStart={trip?.timestampStart ?? 0}
                userCanEditOrDelete={userCanModifyTrip}
              />
            );
          });
        })}
      </div>
      <IdeaSidebar
        activities={activities || []}
        userCanEditOrDelete={userCanModifyTrip}
        isVisible={isSidebarVisible}
      />
      {ideasCount > 0 && (
        <Tooltip
          content={`${isSidebarVisible ? 'Hide' : 'Show'} ideas (${ideasCount})`}
        >
          <IconButton
            variant="outline"
            size="2"
            onClick={toggleSidebar}
            className={clsx(
              s.sidebarToggle,
              isSidebarVisible && s.sidebarToggleActive,
            )}
          >
            {isSidebarVisible ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </IconButton>
        </Tooltip>
      )}
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

  for (let dayIndex = 0; dayIndex < dayGroups.inTrip.length; dayIndex++) {
    const dayGroup = dayGroups.inTrip[dayIndex];
    const colWidth = `minmax(${String(150 / dayGroup.columns)}px,${String(
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
  str += ` [de${String(dayGroups.inTrip.length)}]`;

  return str;
}

function TimetableDayHeaderInner({
  dateString,
  gridColumnStart,
  gridColumnEnd,
  isActive,
  dayIndex,
  userCanModifyTrip,
  trip,
  activities,
  tripDays,
}: {
  dateString: string;
  gridColumnStart: string;
  gridColumnEnd: string;
  isActive?: boolean;
  dayIndex: number;
  userCanModifyTrip: boolean;
  trip: TripSliceTrip | undefined;
  activities: TripSliceActivity[];
  tripDays: Array<{ dayIndex: number; startMs: number }>;
}) {
  const pushDialog = useBoundStore((state) => state.pushDialog);

  const style = useMemo(() => {
    return {
      gridColumnStart: gridColumnStart,
      gridColumnEnd: gridColumnEnd,
    };
  }, [gridColumnStart, gridColumnEnd]);

  const handleSwapDay = useCallback(() => {
    if (!trip || tripDays.length < 2) return;
    const sourceDay = tripDays.find((day) => day.dayIndex === dayIndex);
    if (!sourceDay) return;
    pushDialog(SwapDayDialog, {
      trip,
      activities,
      sourceDayIndex: dayIndex,
      days: tripDays,
    });
  }, [activities, dayIndex, pushDialog, trip, tripDays]);

  const header = (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={clsx(
        s.timetableColumn,
        s.timetableColumnHeader,
        isActive && s.timetableActive,
      )}
      style={style}
    >
      {dateString}
    </Text>
  );

  if (!userCanModifyTrip) {
    return header;
  }

  const canSwap = tripDays.length >= 2;

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>{header}</ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item
          onClick={handleSwapDay}
          disabled={activities.length === 0 || !canSwap}
        >
          Swap activities with another day…
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

function dayGroupsFromTrip(
  trip: TripSliceTrip,
): Array<{ dayIndex: number; startMs: number }> {
  const tripStart = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampStart,
  ).toZonedDateTimeISO(trip.timeZone);
  const tripEnd = Temporal.Instant.fromEpochMilliseconds(
    trip.timestampEnd,
  ).toZonedDateTimeISO(trip.timeZone);
  const days = tripEnd.since(tripStart, { largestUnit: 'days' }).days;

  const result: Array<{ dayIndex: number; startMs: number }> = [];
  for (let i = 0; i < days; i++) {
    result.push({
      dayIndex: i,
      startMs: tripStart.add({ days: i }).startOfDay().epochMilliseconds,
    });
  }
  return result;
}

const TimetableDayHeader = memo(
  TimetableDayHeaderInner,
  (prevProps, nextProps) => {
    return (
      prevProps.dateString === nextProps.dateString &&
      prevProps.gridColumnStart === nextProps.gridColumnStart &&
      prevProps.gridColumnEnd === nextProps.gridColumnEnd &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.dayIndex === nextProps.dayIndex &&
      prevProps.userCanModifyTrip === nextProps.userCanModifyTrip &&
      prevProps.trip === nextProps.trip &&
      prevProps.activities === nextProps.activities &&
      prevProps.tripDays === nextProps.tripDays
    );
  },
);

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
function TimetableTimeInner({
  timeStart: time,
  gridRowStart,
}: {
  timeStart: string;
  gridRowStart: string;
}) {
  return (
    <Text
      as="div"
      size={{ initial: '1', sm: '3' }}
      className={s.timetableTime}
      style={{ gridRowStart: gridRowStart }}
    >
      {time}
    </Text>
  );
}
