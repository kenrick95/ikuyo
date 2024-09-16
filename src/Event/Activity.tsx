import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';
import { useState } from 'react';
import { InfoCircledIcon, SewingPinIcon } from '@radix-ui/react-icons';

import { Text, Box, ContextMenu } from '@radix-ui/themes';
import { DbActivity } from '../data/types';
import { formatTime, pad2 } from './time';
import { DateTime } from 'luxon';
import { ActivityDeleteDialog } from './ActivityDeleteDialog';
import { ActivityEditDialog } from './ActivityEditDialog';
import { ActivityViewDialog } from './ActivityViewDialog';

const timeStartMapping: Record<string, string> = {};
const timeEndMapping: Record<string, string> = {};
const dayStartMapping: Record<string, string> = {};
const dayEndMapping: Record<string, string> = {};

for (let i = 0; i < 24; i++) {
  const hh = pad2(i);
  for (let j = 0; j < 60; j++) {
    const mm = pad2(j);
    timeStartMapping[`${hh}${mm}`] = tClasses[`t${hh}${mm}`];
    timeEndMapping[`${hh}${mm}`] = tClasses[`te${hh}${mm}`];
  }
}
for (let i = 0; i < 100; i++) {
  dayStartMapping[i] = tClasses[`d${i}`];
  dayEndMapping[i] = tClasses[`de${i}`];
}

export function Activity({
  activity,
  className,
}: {
  activity: DbActivity;
  className?: string;
}) {
  const timeStart = formatTime(activity.timestampStart);
  const timeEnd = formatTime(activity.timestampEnd);
  const [dayStart, dayEnd] = getDayStartEnd(activity);
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
              dayEndMapping[dayEnd],
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

function getDayStartEnd(activity: DbActivity) {
  const tripStart = DateTime.fromMillis(activity.trip!.timestampStart);
  const activityStart = DateTime.fromMillis(activity.timestampStart);
  const activityEnd = DateTime.fromMillis(activity.timestampEnd);
  const diffStart = activityStart.diff(tripStart, 'day');
  const diffEnd = activityEnd.diff(tripStart, 'day');
  return [Math.floor(diffStart.days) + 1, Math.floor(diffEnd.days) + 1];
}
