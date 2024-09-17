import clsx from 'clsx';
import style from './Activity.module.css';
import { useState } from 'react';
import { InfoCircledIcon, SewingPinIcon } from '@radix-ui/react-icons';

import { Text, Box, ContextMenu } from '@radix-ui/themes';
import { DbActivity } from '../data/types';
import { formatTime } from './time';
import { DateTime } from 'luxon';
import { ActivityDeleteDialog } from './ActivityDeleteDialog';
import { ActivityEditDialog } from './ActivityEditDialog';
import { ActivityViewDialog } from './ActivityViewDialog';
import {
  dayColMapping,
  dayStartMapping,
  timeEndMapping,
  timeStartMapping,
} from './TimelineStyles';

export function Activity({
  activity,
  className,
  columnIndex,
}: {
  activity: DbActivity;
  className?: string;
  columnIndex: number;
}) {
  const timeStart = formatTime(activity.timestampStart);
  const timeEnd = formatTime(activity.timestampEnd);
  const [dayStart] = getDayStartEnd(activity);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            className={clsx(
              style.activity,
              timeStartMapping[timeStart],
              timeEndMapping[timeEnd],
              dayStartMapping[dayStart],
              dayColMapping[dayStart][columnIndex],
              className
            )}
          >
            <Text as="div" size="2" weight="bold">
              {activity.title}
            </Text>

            {activity.location ? (
              <Text as="div" size="2" color="gray">
                <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
                {activity.location}
              </Text>
            ) : null}

            {activity.description ? (
              <Text as="div" size="2" color="gray">
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

function getDayStartEnd(activity: DbActivity): [number, number] {
  const tripStart = DateTime.fromMillis(activity.trip!.timestampStart);
  const activityStart = DateTime.fromMillis(activity.timestampStart);
  const activityEnd = DateTime.fromMillis(activity.timestampEnd);
  const diffStart = activityStart.diff(tripStart, 'day');
  const diffEnd = activityEnd.diff(tripStart, 'day');
  return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
}
