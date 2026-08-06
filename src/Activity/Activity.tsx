import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Box, ContextMenu, Text, Tooltip } from '@radix-ui/themes';
import clsx from 'clsx';

import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { toFormat } from '../common/dateTime/temporalFormatter';
import { useShouldDisableDragAndDrop } from '../common/deviceUtils';
import { dangerToken } from '../common/ui';
import { useTripTimetableDragging } from '../Trip/store/hooks';
import type { TripSliceActivityWithTime } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import style from './Activity.module.css';
import { useActivityDialogHooks } from './ActivityDialog/activityDialogHooks';
import { getActivityDisplayTitle } from './activityTitle';
import { formatTime } from './time';

const responsiveTextSize = { initial: '1' as const };

function useDayStartEnd(
  activity: TripSliceActivityWithTime,
  tripTimestampStart: number,
  tripTimeZone: string,
): [number, number] {
  return useMemo(() => {
    const tripStart =
      Temporal.Instant.fromEpochMilliseconds(
        tripTimestampStart,
      ).toZonedDateTimeISO(tripTimeZone);
    const activityStartRelativeToTrip = Temporal.Instant.fromEpochMilliseconds(
      activity.timestampStart,
    ).toZonedDateTimeISO(tripTimeZone);
    const activityEndRelativeToTrip = Temporal.Instant.fromEpochMilliseconds(
      // Deduct 1ms so that an activity that ends exactly at midnight is considered to end on the previous day
      activity.timestampEnd - 1,
    ).toZonedDateTimeISO(tripTimeZone);
    const diffStart = activityStartRelativeToTrip.since(tripStart, {
      largestUnit: 'days',
    });
    const diffEnd = activityEndRelativeToTrip.since(tripStart, {
      largestUnit: 'days',
    });
    return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
  }, [
    activity.timestampStart,
    activity.timestampEnd,
    tripTimestampStart,
    tripTimeZone,
  ]);
}

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
  const activityStartDateTime =
    activity && activity.timestampStart != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampStart,
        ).toZonedDateTimeISO(activity.timeZoneStart ?? tripTimeZone)
      : undefined;
  const activityEndDateTime =
    activity && activity.timestampEnd != null
      ? Temporal.Instant.fromEpochMilliseconds(
          activity.timestampEnd,
        ).toZonedDateTimeISO(activity.timeZoneEnd ?? tripTimeZone)
      : undefined;

  /** Relative to activity (for home) */
  const activityTimeStr = useMemo(() => {
    if (activityStartDateTime && activityEndDateTime) {
      if (activityStartDateTime.timeZoneId === activityEndDateTime.timeZoneId) {
        // Same timezone, show timezone only once
        if (
          activityStartDateTime
            .toPlainDate()
            .equals(activityEndDateTime.toPlainDate())
        ) {
          // If same day, only show time
          return (
            <>
              {toFormat('d MMMM yyyy', activityStartDateTime)}{' '}
              {toFormat('HH:mm', activityStartDateTime)} &ndash;{' '}
              {toFormat('HH:mm', activityEndDateTime)} (
              {activityStartDateTime.timeZoneId})
            </>
          );
        }
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityStartDateTime.timeZoneId})
          </>
        );
      } else {
        // Different timezone, show both
        return (
          <>
            {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
            {activityStartDateTime.timeZoneId}) &ndash;{' '}
            {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
            {activityEndDateTime.timeZoneId})
          </>
        );
      }
    } else if (activityStartDateTime) {
      // Only start is set
      return (
        <>
          {toFormat('d MMMM yyyy HH:mm', activityStartDateTime)} (
          {activityStartDateTime.timeZoneId}) &ndash; No end time
        </>
      );
    } else if (activityEndDateTime) {
      // Only end is set
      return (
        <>
          No start time &ndash;{' '}
          {toFormat('d MMMM yyyy HH:mm', activityEndDateTime)} (
          {activityEndDateTime.timeZoneId})
        </>
      );
    } else {
      return 'No time set';
    }
  }, [activityStartDateTime, activityEndDateTime]);

  /** Relative to trip (for timetable/list) */
  const timeStartRelativeToTrip = useMemo(
    () => formatTime(activity.timestampStart, tripTimeZone),
    [activity.timestampStart, tripTimeZone],
  );
  /** Relative to trip (for timetable/list) */
  const timeEndRelativeToTrip = useMemo(() => {
    // If the activity ends exactly at midnight, use 2359; else it layout will be wrong
    const end = formatTime(activity.timestampEnd, tripTimeZone);
    if (end === '0000') {
      return '2359';
    }
    return end;
  }, [activity.timestampEnd, tripTimeZone]);
  const [dayStart, dayEnd] = useDayStartEnd(
    activity,
    tripTimestampStart,
    tripTimeZone,
  );
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
    openActivityDuplicateDialog,
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
        mode: 'drag',
      });

      // Store the activity data for the drop
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          activityId: activity.id,
          originalTimeStart: timeStartRelativeToTrip,
          originalTimeEnd: timeEndRelativeToTrip,
          originalDayStart: dayStart,
          mode: 'drag',
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
      timeStartRelativeToTrip,
      timeEndRelativeToTrip,
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
      setTimetableDragging(false, undefined);
    },
    [tripViewMode, isDragAndDropDisabled, setTimetableDragging],
  );

  const handleResizeStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (tripViewMode !== TripViewMode.Timetable || isDragAndDropDisabled) {
        // Prevent resizing if the trip is not in timetable view or drag is disabled
        e.preventDefault();
        return;
      }
      setTimetableDragging(true, {
        activityId: activity.id,
        mode: 'resize',
      });

      // Store the activity data for the drop
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          activityId: activity.id,
          originalTimeStart: timeStartRelativeToTrip,
          originalTimeEnd: timeEndRelativeToTrip,
          originalDayStart: dayStart,
          mode: 'resize',
        }),
      );

      // Set the drag image/opacity
      e.dataTransfer.effectAllowed = 'move';
      if (e.currentTarget.parentElement) {
        e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
      }

      e.stopPropagation(); // Prevent triggering the parent drag event
    },
    [
      activity.id,
      timeStartRelativeToTrip,
      timeEndRelativeToTrip,
      dayStart,
      tripViewMode,
      isDragAndDropDisabled,
      setTimetableDragging,
    ],
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

  const handleContextMenuDuplicate = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityDuplicateDialog();
  }, [openActivityDuplicateDialog]);

  const handleContextMenuDelete = useCallback(() => {
    shouldRestoreFocus.current = true;
    openActivityDeleteDialog();
  }, [openActivityDeleteDialog]);

  const activityTitle = getActivityDisplayTitle(activity);
  const boxStyle = useMemo(() => {
    return {
      gridRowStart: `t${timeStartRelativeToTrip}`,
      gridRowEnd: `te${timeEndRelativeToTrip}`,
      gridColumnStart: `d${String(dayStart)}-c${String(columnIndex)}`,
      gridColumnEnd:
        columnIndex === columnEndIndex ? undefined : `de${String(dayEnd)}`,
    };
  }, [
    columnEndIndex,
    columnIndex,
    dayEnd,
    dayStart,
    timeEndRelativeToTrip,
    timeStartRelativeToTrip,
  ]);

  const isSmallActivity = useMemo(() => {
    if (isDragAndDropDisabled) {
      return false;
    }
    if (tripViewMode !== TripViewMode.Timetable) {
      return false;
    }
    if (activity.timestampStart == null || activity.timestampEnd == null) {
      return false;
    }
    const activityDuration = activity.timestampEnd - activity.timestampStart;
    if (activityDuration > 30 * 60 * 1000) {
      return false;
    }
    return true;
  }, [
    isDragAndDropDisabled,
    tripViewMode,
    activity.timestampStart,
    activity.timestampEnd,
  ]);

  const isActivityResizable = useMemo(() => {
    if (isDragAndDropDisabled) {
      return false;
    }
    if (!userCanEditOrDelete) {
      return false;
    }
    if (activity.timestampStart == null || activity.timestampEnd == null) {
      return false;
    }
    if (tripViewMode !== TripViewMode.Timetable) {
      return false;
    }
    const activityDuration = activity.timestampEnd - activity.timestampStart;
    if (activityDuration < 15 * 60 * 1000) {
      // If the activity is less than 15 minutes, don't allow resizing, because it will be too small to resize
      return false;
    }
    return true;
  }, [
    isDragAndDropDisabled,
    tripViewMode,
    userCanEditOrDelete,
    activity.timestampStart,
    activity.timestampEnd,
  ]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <TooltipForSmallActivity
          content={activityTitle}
          isSmallActivity={isSmallActivity}
        >
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
                ? timetableDragging.source.mode === 'drag'
                  ? style.activityDragging
                  : style.activityResizing
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
            style={boxStyle}
          >
            {tripViewMode === TripViewMode.List ? (
              <Text
                as="div"
                size={responsiveTextSize}
                color="gray"
                className={style.activityTime}
              >
                <ClockIcon style={{ verticalAlign: '-2px' }} />{' '}
                {timeStartRelativeToTrip} - {timeEndRelativeToTrip}
              </Text>
            ) : null}
            {tripViewMode === TripViewMode.Home ? (
              <Text
                as="div"
                size={responsiveTextSize}
                color="gray"
                className={style.activityTime}
              >
                <ClockIcon style={{ verticalAlign: '-2px' }} />{' '}
                {activityTimeStr}
              </Text>
            ) : null}

            <Text
              as="div"
              size={responsiveTextSize}
              weight="bold"
              className={style.activityTitle}
            >
              {activityTitle}
            </Text>

            {activity.location ? (
              <Text
                as="div"
                size={responsiveTextSize}
                color="gray"
                className={style.activityLocation}
              >
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

            {isActivityResizable ? (
              // biome-ignore lint/a11y/noStaticElementInteractions: indicator for resizing
              <div
                className={style.activityResizeHint}
                onDragStart={handleResizeStart}
                draggable={
                  tripViewMode === TripViewMode.Timetable &&
                  userCanEditOrDelete &&
                  !isDragAndDropDisabled
                }
              />
            ) : null}
          </Box>
        </TooltipForSmallActivity>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{activityTitle}</ContextMenu.Label>
        <ContextMenu.Item onClick={handleContextMenuView}>
          View
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={userCanEditOrDelete ? handleContextMenuEdit : undefined}
          disabled={!userCanEditOrDelete}
        >
          Edit
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={userCanEditOrDelete ? handleContextMenuDuplicate : undefined}
          disabled={!userCanEditOrDelete}
        >
          Duplicate
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

function TooltipForSmallActivity({
  content,
  isSmallActivity,
  children,
}: {
  content: string;
  isSmallActivity: boolean;
  children: React.ReactNode;
}) {
  if (isSmallActivity) {
    return <Tooltip content={content}>{children}</Tooltip>;
  }
  return <>{children}</>;
}

export const Activity = memo(ActivityInner, (prevProps, nextProps) => {
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.title === nextProps.activity.title &&
    prevProps.activity.icon === nextProps.activity.icon &&
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
