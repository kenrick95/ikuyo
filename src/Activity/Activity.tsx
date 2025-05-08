import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import clsx from 'clsx';
import { useMemo } from 'react';
import style from './Activity.module.css';

import { Box, ContextMenu, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { formatTime } from './time';

import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';

import { dangerToken } from '../ui';

import { useActivityDialogHooks } from './activityDialogHooks';
import type { DbActivityWithTrip } from './db';

export function Activity({
  activity,
  className,
  columnIndex,
  columnEndIndex,
  tripViewMode,
}: {
  activity: DbActivityWithTrip;
  className?: string;
  columnIndex: number;
  columnEndIndex: number;
  tripViewMode: TripViewModeType;
}) {
  const timeStart = formatTime(activity.timestampStart, activity.trip.timeZone);
  const timeEnd = formatTime(activity.timestampEnd, activity.trip.timeZone);
  const [dayStart, dayEnd] = getDayStartEnd(activity);
  const responsiveTextSize = { initial: '1' as const };
  const isActivityOngoing = useMemo(() => {
    const now = Date.now();
    return activity.timestampStart <= now && now <= activity.timestampEnd;
  }, [activity.timestampEnd, activity.timestampStart]);
  const {
    openActivityViewDialog,
    openActivityDeleteDialog,
    openActivityEditDialog,
  } = useActivityDialogHooks(tripViewMode, activity.id);

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            p={{ initial: '1' }}
            as="div"
            // biome-ignore lint/a11y/useSemanticElements: <Box> need to be a <div>
            role="button"
            tabIndex={0}
            className={clsx(
              style.activity,
              isActivityOngoing ? style.activityOngoing : '',
              className,
            )}
            onClick={openActivityViewDialog}
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
              <>
                <Text as="div" size={responsiveTextSize} color="gray">
                  <ClockIcon style={{ verticalAlign: '-2px' }} /> {timeStart} -{' '}
                  {timeEnd}
                </Text>
              </>
            ) : null}

            <Text as="div" size={responsiveTextSize} weight="bold">
              {activity.title}
            </Text>

            {activity.location ? (
              <Text as="div" size={responsiveTextSize} color="gray">
                <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
                {activity.location}
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
          <ContextMenu.Item onClick={openActivityViewDialog}>
            View
          </ContextMenu.Item>
          <ContextMenu.Item onClick={openActivityEditDialog}>
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color={dangerToken}
            onClick={openActivityDeleteDialog}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </>
  );
}

function getDayStartEnd(activity: DbActivityWithTrip): [number, number] {
  const tripStart = DateTime.fromMillis(activity.trip.timestampStart).setZone(
    activity.trip.timeZone,
  );
  const activityStart = DateTime.fromMillis(activity.timestampStart).setZone(
    activity.trip.timeZone,
  );
  const activityEnd = DateTime.fromMillis(activity.timestampEnd).setZone(
    activity.trip.timeZone,
  );
  const diffStart = activityStart.diff(tripStart, 'day');
  const diffEnd = activityEnd.diff(tripStart, 'day');
  return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
}
