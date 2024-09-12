import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';
import { dbAddActivity, dbDeleteActivity, dbUpdateActivity } from '../data/db';
import { useCallback, useId, useState } from 'react';

import {
  AlertDialog,
  Box,
  ContextMenu,
  Dialog,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Button } from '@radix-ui/themes';
import { useBoundStore } from '../data/store';
import { DbActivity, DbTrip } from '../data/types';
import { formatTime, formatToDatetimeLocalInput, pad2 } from './time';
import { DateTime } from 'luxon';

const timeStartMapping: Record<string, string> = {};
const timeEndMapping: Record<string, string> = {};

for (let i = 0; i < 24; i++) {
  const hh = pad2(i);
  for (let j = 0; j < 60; j++) {
    const mm = pad2(j);
    timeStartMapping[`${hh}${mm}`] = tClasses[`t${hh}${mm}`];
    timeEndMapping[`${hh}${mm}`] = tClasses[`te${hh}${mm}`];
  }
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <div
            className={clsx(
              style.activity,
              timeStartMapping[timeStart],
              timeEndMapping[timeEnd],
              className
            )}
          >
            {activity.title}
          </div>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
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
      {editDialogOpen ? (
        <ActivityEditDialog
          activity={activity}
          dialogOpen={editDialogOpen}
          setDialogOpen={setEditDialogOpen}
        />
      ) : null}
      {deleteDialogOpen ? (
        <ActivityDeleteConfirmationDialog
          activity={activity}
          dialogOpen={deleteDialogOpen}
          setDialogOpen={setDeleteDialogOpen}
        />
      ) : null}
    </>
  );
}

export function ActivityDeleteConfirmationDialog({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const deleteActivity = useCallback(() => {
    dbDeleteActivity(activity);
    publishToast({
      root: {},
      title: { children: `Activity "${activity.title}" deleted` },
      close: {},
    });

    setDialogOpen(false);
  }, [publishToast, activity, setDialogOpen]);

  return (
    <AlertDialog.Root
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      defaultOpen={dialogOpen}
    >
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>Delete Activity</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure to delete activity "{activity.title}"?
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action onClick={deleteActivity}>
            <Button variant="solid" color="red">
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export function ActivityEditDialog({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.trip.timestampStart)
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.trip.timestampEnd)
  );
  const activityStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.timestampStart)
  );
  const activityEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(activity.timestampEnd)
  );
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Edit Activity</Dialog.Title>
        <Dialog.Description>
          Fill in your edited activity details...
        </Dialog.Description>
        <Box height="16px" />
        <ActivityForm
          activityId={activity.id}
          mode={ActivityFormMode.Edit}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          activityTitle={activity.title}
          activityStartStr={activityStartStr}
          activityEndStr={activityEndStr}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}

enum ActivityFormMode {
  New,
  Edit,
}

function ActivityForm({
  mode,
  activityId,
  tripId,
  setDialogOpen,
  tripStartStr,
  tripEndStr,
  activityTitle,
  activityStartStr,
  activityEndStr,
}: {
  mode: ActivityFormMode;
  activityId?: string;
  tripId?: string;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
  tripStartStr: string;
  tripEndStr: string;
  activityTitle: string;
  activityStartStr: string;
  activityEndStr: string;
}) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        if (!elForm.reportValidity()) {
          return;
        }
        const formData = new FormData(elForm);
        const title = formData.get('title')?.toString() ?? '';
        const timeStartString = formData.get('startTime')?.toString() ?? '';
        const timeEndString = formData.get('endTime')?.toString() ?? '';
        const timeStartDate = new Date(timeStartString);
        const timeEndDate = new Date(timeStartString);
        console.log('ActivityForm', {
          mode,
          activityId,
          tripId,
          title,
          startTime: timeStartDate,
          endTime: timeEndDate,
        });
        if (!title || !timeStartDate || !timeEndDate) {
          return;
        }
        if (timeStartDate > timeEndDate) {
          // TODO: show error
          return;
        }
        if (mode === ActivityFormMode.Edit && activityId) {
          dbUpdateActivity({
            id: activityId,
            title,
            timestampStart: new Date(timeStartString).getTime(),
            timestampEnd: new Date(timeEndString).getTime(),
          });
          publishToast({
            root: {},
            title: { children: `Activity ${title} edited` },
            close: {},
          });
        } else if (mode === ActivityFormMode.New && tripId) {
          dbAddActivity(
            {
              title,
              timestampStart: new Date(timeStartString).getTime(),
              timestampEnd: new Date(timeEndString).getTime(),
            },
            {
              tripId: tripId,
            }
          );
          publishToast({
            root: {},
            title: { children: `Activity ${title} added` },
            close: {},
          });
        }
        elForm.reset();
        setDialogOpen(false);
      }}
    >
      <Flex direction="column" gap="2">
        <Text as="label" htmlFor={idTitle}>
          Activity name
        </Text>
        <TextField.Root
          defaultValue={activityTitle}
          placeholder="Enter activity name"
          name="title"
          type="text"
          id={idTitle}
          required
        />
        <Text as="label" htmlFor={idTimeStart}>
          Start time
        </Text>
        <TextField.Root
          id={idTimeStart}
          name="startTime"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={activityStartStr}
          required
        />
        <Text as="label" htmlFor={idTimeEnd}>
          End time
        </Text>
        <TextField.Root
          id={idTimeEnd}
          name="endTime"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={activityEndStr}
          required
        />
      </Flex>
      <Flex gap="3" mt="5" justify="end">
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={closeDialog}
        >
          Cancel
        </Button>
        <Button type="submit" size="2" variant="solid">
          Save
        </Button>
      </Flex>
    </form>
  );
}

export function AddNewActivityButton({ trip }: { trip: DbTrip }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const tripStartStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampStart)
  );
  const tripEndStr = formatToDatetimeLocalInput(
    DateTime.fromMillis(trip.timestampEnd)
  );

  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Trigger>
        <Button className={style.triggerNewForm}>Add new activity</Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>Add New Activity</Dialog.Title>
        <Dialog.Description>
          Fill in your new activity details...
        </Dialog.Description>
        <Box height="16px" />
        <ActivityForm
          mode={ActivityFormMode.New}
          tripId={trip.id}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          tripStartStr={tripStartStr}
          tripEndStr={tripEndStr}
          activityTitle={''}
          activityStartStr={tripStartStr}
          activityEndStr={tripEndStr}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
