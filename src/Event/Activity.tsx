import clsx from 'clsx';
import style from './Activity.module.css';
import tClasses from './Timeline.module.scss';
import { addActivity, deleteActivity, updateActivity } from '../data/db';
import { useCallback, useId, useState } from 'react';

import {
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
              // TODO: push to zustand store
              // then render edit form once...
              // not correct to have 1 edit form per component
            }}
          >
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            onClick={() => {
              // Confirm
              // then call
              // deleteActivity(activity);
            }}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </>
  );
}

export function ActivityEditForm({ activity }: { activity: DbActivity }) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const [dialogOpen, setDialogOpen] = useState(true);
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    publishToast({
      root: {},
      title: { children: 'Activity edit cancelled' },
      close: {},
    });
    setDialogOpen(false);
  }, [publishToast]);

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
            <Button type="submit" size="2">
              Save
            </Button>
            <Button
              type="button"
              size="2"
              variant="outline"
              onClick={closeDialog}
            >
              Cancel
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
            <Button type="submit" size="2">
              Save
            </Button>
            <Button
              type="button"
              size="2"
              variant="outline"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
