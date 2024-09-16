import { Flex, Text, TextField, TextArea, Button } from '@radix-ui/themes';
import { useId, useCallback, useState } from 'react';
import { dbUpdateActivity, dbAddActivity } from '../data/db';
import { useBoundStore } from '../data/store';
import { ActivityFormMode } from './ActivityFormMode';
import { getDateTimeFromDatetimeLocalInput } from './time';

export function ActivityForm({
  mode,
  activityId,
  tripId,
  setDialogOpen,
  tripStartStr,
  tripEndStr,
  activityTitle,
  activityStartStr,
  activityEndStr,
  activityLocation,
  activityDescription,
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
  activityLocation: string;
  activityDescription: string;
}) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const idLocation = useId();
  const idDescription = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);
  const [errorMessage, setErrorMessage] = useState('');

  return (
    <form
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        setErrorMessage('');
        // TIL: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity
        // HTMLInputElement.setCustomValidity()
        // seems quite hard to use... need to call setCustomValidity again after invalid, before "submit" event
        if (!elForm.reportValidity()) {
          return;
        }
        const formData = new FormData(elForm);
        const title = formData.get('title')?.toString() ?? '';
        const description = formData.get('description')?.toString() ?? '';
        const location = formData.get('location')?.toString() ?? '';
        const timeStartString = formData.get('startTime')?.toString() ?? '';
        const timeEndString = formData.get('endTime')?.toString() ?? '';
        const timeStartDate =
          getDateTimeFromDatetimeLocalInput(timeStartString);
        const timeEndDate = getDateTimeFromDatetimeLocalInput(timeEndString);
        console.log('ActivityForm', {
          mode,
          activityId,
          description,
          location,
          tripId,
          title,
          timeStartString,
          timeEndString,
          startTime: timeStartDate,
          endTime: timeEndDate,
        });
        if (!title || !timeStartDate || !timeEndDate) {
          return;
        }
        if (timeEndDate.diff(timeStartDate).as('minute') < 0) {
          setErrorMessage(`End time must be after start time`);
          return;
        }
        if (!timeEndDate.hasSame(timeStartDate, 'day')) {
          setErrorMessage(`Activity must occur on same day`);
          return;
        }
        if (mode === ActivityFormMode.Edit && activityId) {
          dbUpdateActivity({
            id: activityId,
            title,
            description,
            location,
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
              description,
              location,
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
        <Text color="red" size="2">{errorMessage}&nbsp;</Text>
        <Text as="label" htmlFor={idTitle}>
          Activity name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={activityTitle}
          placeholder="Enter activity name"
          name="title"
          type="text"
          id={idTitle}
          required
        />
        <Text as="label" htmlFor={idLocation}>
          Location
        </Text>
        <TextArea
          defaultValue={activityLocation}
          placeholder="Enter location name"
          name="location"
          id={idLocation}
        />
        <Text as="label" htmlFor={idTimeStart}>
          Start time{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
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
          End time{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
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
        <Text as="label" htmlFor={idLocation}>
          Description
        </Text>
        <TextArea
          defaultValue={activityDescription}
          placeholder="Enter description"
          name="description"
          id={idDescription}
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