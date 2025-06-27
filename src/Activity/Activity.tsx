import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { DateTime } from 'luxon';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { useShouldDisableDragAndDrop } from '../common/deviceUtils';
import { dangerToken } from '../common/ui';
import { useTripTimetableDragging } from '../Trip/store/hooks';
import type { TripSliceActivityWithTime } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import style from './Activity.module.css';
import { useActivityDialogHooks } from './ActivityDialog/activityDialogHooks';
import { formatTime } from './time';

function ActivityInner({
  activity,
  className,
  columnIndex,
  columnEndIndex,
  tripViewMode,
  tripTimeZone,
  tripTimestampStart,
  userCanEditOrDelete,
}: {
  activity: TripSliceActivityWithTime;
  className?: string;
  columnIndex: number;
  columnEndIndex: number;
  tripViewMode: TripViewModeType;

  tripTimeZone: string;
  tripTimestampStart: number;
  userCanEditOrDelete: boolean;
}) {
  const timeStart = formatTime(activity.timestampStart, tripTimeZone);
  const timeEnd = formatTime(activity.timestampEnd, tripTimeZone);
  const [dayStart, dayEnd] = getDayStartEnd(
    activity,
    tripTimestampStart,
    tripTimeZone,
  );
  const responsiveTextSize = { initial: '1' as const };
  const { timetableDragging, setTimetableDragging } =
    useTripTimetableDragging();
  const activityRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const isDragAndDropDisabled = useShouldDisableDragAndDrop();
  const isActivityOngoing = useMemo(() => {
    const now = Date.now();
    return activity.timestampStart <= now && now <= activity.timestampEnd;
  }, [activity.timestampEnd, activity.timestampStart]);
  const {
    openActivityViewDialog,
    openActivityDeleteDialog,
    openActivityEditDialog,
  } = useActivityDialogHooks(tripViewMode, activity.id);

  // Track if we should restore focus after dialog closes
  const shouldRestoreFocus = useRef(false);

  // Detect when dialog closes and restore focus
  useEffect(() => {
    // If we were in a dialog state and now we're not, restore focus
    if (shouldRestoreFocus.current && location === '/') {
      activityRef.current?.focus();
      shouldRestoreFocus.current = false;
    }
  }, [location]);

  // Drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (tripViewMode !== TripViewMode.Timetable || isDragAndDropDisabled) {
        // Prevent dragging if the trip is not in timetable view or drag is disabled
        e.preventDefault();
        return;
      }
      setTimetableDragging(true, {
        activityId: activity.id,
      });

      // Store the activity data for the drop
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          activityId: activity.id,
          originalTimeStart: timeStart,
          originalTimeEnd: timeEnd,
          originalDayStart: dayStart,
        }),
      );

      // Set the drag image/opacity
      e.dataTransfer.effectAllowed = 'move';
      if (e.currentTarget.parentElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
      }
    },
    [
      activity.id,
      timeStart,
      timeEnd,
      dayStart,
      tripViewMode,
      isDragAndDropDisabled,
      setTimetableDragging,
    ],
  );
  // Handle dropping on the timetable grid is implemented in Timetable component
  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (tripViewMode !== TripViewMode.Timetable || isDragAndDropDisabled) {
        // Prevent dragging if the trip is not in timetable view or drag is disabled
        e.preventDefault();
        return;
      }
      setTimetableDragging(false);
    },
    [tripViewMode, isDragAndDropDisabled, setTimetableDragging],
  );
  // Handle keyboard navigation for accessibility
  // Use onKeyDown for Enter to open the dialog
  // Use onKeyUp for Space to open the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // To avoid scrolling for both keys
        e.preventDefault();
        if (e.key === 'Enter') {
          shouldRestoreFocus.current = true;
          openActivityViewDialog();
        }
      }
    },
    [openActivityViewDialog],
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        e.preventDefault();
        shouldRestoreFocus.current = true;
        openActivityViewDialog();
      }
    },
    [openActivityViewDialog],
  );

  const handleClick = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityViewDialog();
  }, [openActivityViewDialog]);

  const handleContextMenuView = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityViewDialog();
  }, [openActivityViewDialog]);

  const handleContextMenuEdit = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityEditDialog();
  }, [openActivityEditDialog]);

  const handleContextMenuDelete = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityDeleteDialog();
  }, [openActivityDeleteDialog]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {/** biome-ignore lint/a11y/useSemanticElements: <Box> need to be a <div> */}
        <Box
          p={{ initial: '1' }}
          as="div"
          role="button"
          tabIndex={0}
          ref={activityRef}
          className={clsx(
            style.activity,
            isActivityOngoing ? style.activityOngoing : '',
            timetableDragging.dragging &&
              timetableDragging.source.activityId === activity.id
              ? style.activityDragging
              : '',
            className,
          )}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          draggable={
            tripViewMode === TripViewMode.Timetable &&
            userCanEditOrDelete &&
            !isDragAndDropDisabled
          }
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          style={{
            gridRowStart: `t${timeStart}`,
            gridRowEnd: `te${timeEnd}`,
            gridColumnStart: `d${String(dayStart)}-c${String(columnIndex)}`,
            gridColumnEnd:
              columnIndex === columnEndIndex
                ? undefined
                : `de${String(dayEnd)}`,
          }}
        >
          {tripViewMode === TripViewMode.List ? (
            <Text as="div" size={responsiveTextSize} color="gray">
              <ClockIcon style={{ verticalAlign: '-2px' }} /> {timeStart} -{' '}
              {timeEnd}
            </Text>
          ) : null}

          <Text as="div" size={responsiveTextSize} weight="bold">
            {activity.title}
          </Text>

          {activity.location ? (
            <Text as="div" size={responsiveTextSize} color="gray">
              <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
              {activity.location}
              {activity.locationDestination
                ? ` → ${activity.locationDestination}`
                : null}
            </Text>
          ) : null}

          {activity.description ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={style.activityDescription}
            >
              <InfoCircledIcon style={{ verticalAlign: '-2px' }} />{' '}
              {activity.description}
            </Text>
          ) : null}
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{activity.title}</ContextMenu.Label>
        <ContextMenu.Item onClick={handleContextMenuView}>
          View
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={userCanEditOrDelete ? handleContextMenuEdit : undefined}
          disabled={!userCanEditOrDelete}
        >
          Edit
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          color={dangerToken}
          onClick={userCanEditOrDelete ? handleContextMenuDelete : undefined}
          disabled={!userCanEditOrDelete}
        >
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}

function getDayStartEnd(
  activity: TripSliceActivityWithTime,
  tripTimestampStart: number,
  tripTimeZone: string,
): [number, number] {
  const tripStart =
    DateTime.fromMillis(tripTimestampStart).setZone(tripTimeZone);
  const activityStart = DateTime.fromMillis(activity.timestampStart).setZone(
    tripTimeZone,
  );
  const activityEnd = DateTime.fromMillis(activity.timestampEnd).setZone(
    tripTimeZone,
  );
  const diffStart = activityStart.diff(tripStart, 'day');
  const diffEnd = activityEnd.diff(tripStart, 'day');
  return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
}
export const Activity = memo(ActivityInner, (prevProps, nextProps) => {
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.title === nextProps.activity.title &&
    prevProps.activity.timestampStart === nextProps.activity.timestampStart &&
    prevProps.activity.timestampEnd === nextProps.activity.timestampEnd &&
    prevProps.activity.location === nextProps.activity.location &&
    prevProps.className === nextProps.className &&
    prevProps.columnIndex === nextProps.columnIndex &&
    prevProps.columnEndIndex === nextProps.columnEndIndex &&
    prevProps.tripViewMode === nextProps.tripViewMode &&
    prevProps.tripTimeZone === nextProps.tripTimeZone &&
    prevProps.tripTimestampStart === nextProps.tripTimestampStart &&
    prevProps.userCanEditOrDelete === nextProps.userCanEditOrDelete
  );
});
