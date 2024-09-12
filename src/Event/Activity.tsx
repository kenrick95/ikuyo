import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';
import { addActivity, deleteActivity as dbDeleteActivity, updateActivity } from '../data/db';
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
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
      {editDialogOpen ? (
        <ActivityEditForm
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
              Revoke access
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

export function ActivityEditForm({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    publishToast({
      root: {},
      title: { children: 'Activity edit cancelled' },
      close: {},
    });
    setDialogOpen(false);
  }, [publishToast, setDialogOpen]);

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
            console.log('ActivityEditForm', {
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

            updateActivity({
              id: activity.id,
              title,
              timestampStart: new Date(timeStartString).getTime(),
              timestampEnd: new Date(timeEndString).getTime(),
            });
            elForm.reset();
            publishToast({
              root: {},
              title: { children: 'Activity edited' },
              close: {},
            });
            setDialogOpen(false);
          }}
        >
          <Flex direction="column" gap="2">
            <Text as="label" htmlFor={idTitle}>
              Activity name
            </Text>
            <TextField.Root
              defaultValue={activity.title}
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
          <Box height="32px" />
          <Flex gap="2" justify="end">
            <Button
              type="button"
              size="2"
              variant="outline"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" size="2">
              Save
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function TriggerNewActivity({ trip }: { trip: DbTrip }) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const [dialogOpen, setDialogOpen] = useState(false);
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    publishToast({
      root: {},
      title: { children: 'Activity creation cancelled' },
      close: {},
    });
    setDialogOpen(false);
  }, [publishToast]);

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
            console.log('NewActivityForm', {
              title,
              startTime: timeStartDate,
              endTime: timeEndDate,
            });
            if (!title || !timeStartDate || !timeEndDate) {
              return;
            }
            if (timeStartDate > timeEndDate) {
              return;
            }
            addActivity(
              {
                title,
                timestampStart: new Date(timeStartString).getTime(),
                timestampEnd: new Date(timeEndString).getTime(),
              },
              {
                trip,
              }
            );
            elForm.reset();
            publishToast({
              root: {},
              title: { children: 'New activity created' },
              close: {},
            });
            setDialogOpen(false);
          }}
        >
          <Flex direction="column" gap="2">
            <Text as="label" htmlFor={idTitle}>
              Activity name
            </Text>
            <TextField.Root
              defaultValue=""
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
              defaultValue={tripStartStr}
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
              defaultValue={tripEndStr}
              required
            />
          </Flex>
          <Box height="32px" />
          <Flex gap="2" justify="end">
            <Button
              type="button"
              size="2"
              variant="outline"
              onClick={closeDialog}
            >
              Cancel
            </Button>
            <Button type="submit" size="2">
              Save
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
