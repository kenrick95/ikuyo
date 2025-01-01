import clsx from 'clsx';
import style from './Activity.module.css';
import { useMemo, useState } from 'react';
import {
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';

import { Text, Box, ContextMenu } from '@radix-ui/themes'; 
import { formatTime } from './time';
import { DateTime } from 'luxon';
import {
  dayColMapping,
  dayEndMapping,
  dayStartMapping,
  timeEndMapping,
  timeStartMapping,
} from '../Timetable/TimetableStyles';
import { TripViewMode } from '../Trip/TripViewMode';

import { ActivityViewDialog } from './ActivityViewDialog';
import { ActivityDeleteDialog } from './ActivityDeleteDialog';
import { ActivityEditDialog } from './ActivityEditDialog';
import { DbActivityWithTrip } from './db';

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
  tripViewMode: TripViewMode;
}) {
  const timeStart = formatTime(activity.timestampStart, activity.trip.timeZone);
  const timeEnd = formatTime(activity.timestampEnd, activity.trip.timeZone);
  const [dayStart, dayEnd] = getDayStartEnd(activity);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const responsiveTextSize = { initial: '1' as const };
  const isActivityOngoing = useMemo(() => {
    const now = Date.now();
    return activity.timestampStart <= now && now <= activity.timestampEnd;
  }, [activity.timestampEnd, activity.timestampStart]);

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            p={{ initial: '1' }}
            as="div"
            role="button"
            tabIndex={0}
            className={clsx(
              style.activity,
              timeStartMapping[timeStart],
              timeEndMapping[timeEnd],
              dayStartMapping[dayStart],
              dayColMapping[dayStart][columnIndex],
              columnIndex === columnEndIndex ? '' : dayEndMapping[dayEnd],
              isActivityOngoing ? style.activityOngoing : '',
              className
            )}
            onClick={() => {
              setViewDialogOpen(true);
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
          <ContextMenu.Item
            onClick={() => {
              setViewDialogOpen(true);
            }}
          >
            View
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={() => {
              setEditDialogOpen(true);
            }}
          >
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color="red"
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
      {viewDialogOpen ? (
        <ActivityViewDialog
          activity={activity}
          dialogOpen={viewDialogOpen}
          setDialogOpen={setViewDialogOpen}
          setEditDialogOpen={setEditDialogOpen}
          setDeleteDialogOpen={setDeleteDialogOpen}
        />
      ) : null}
      {editDialogOpen ? (
        <ActivityEditDialog
          activity={activity}
          dialogOpen={editDialogOpen}
          setDialogOpen={setEditDialogOpen}
        />
      ) : null}
      {deleteDialogOpen ? (
        <ActivityDeleteDialog
          activity={activity}
          dialogOpen={deleteDialogOpen}
          setDialogOpen={setDeleteDialogOpen}
        />
      ) : null}
    </>
  );
}

function getDayStartEnd(activity: DbActivityWithTrip): [number, number] {
  const tripStart = DateTime.fromMillis(activity.trip.timestampStart).setZone(
    activity.trip.timeZone
  );
  const activityStart = DateTime.fromMillis(activity.timestampStart).setZone(
    activity.trip.timeZone
  );
  const activityEnd = DateTime.fromMillis(activity.timestampEnd).setZone(
    activity.trip.timeZone
  );
  const diffStart = activityStart.diff(tripStart, 'day');
  const diffEnd = activityEnd.diff(tripStart, 'day');
  return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
}
