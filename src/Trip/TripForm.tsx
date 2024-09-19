import { Flex, Text, TextField, Button, Select } from '@radix-ui/themes';
import { useId, useCallback, useState } from 'react';
import { dbUpdateTrip, dbAddTrip } from '../data/db';
import { useBoundStore } from '../data/store';
import { TripFormMode } from './TripFormMode';
import { getDateTimeFromDateInput } from './time';

export function TripForm({
  mode,
  tripId,
  setDialogOpen,
  tripStartStr,
  tripEndStr,
  tripTitle,
  tripTimeZone,
  userId,
}: {
  mode: TripFormMode;
  tripId?: string;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
  tripStartStr: string;
  tripEndStr: string;
  tripTitle: string;
  tripTimeZone: string;
  userId?: string;
}) {
  const idTitle = useId();
  const idTimeStart = useId();
  const idTimeEnd = useId();
  const idTimeZone = useId();
  const publishToast = useBoundStore((state) => state.publishToast);
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);
  const [errorMessage, setErrorMessage] = useState('');
  const timeZones = Intl.supportedValuesOf('timeZone');

  return (
    <form
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        setErrorMessage('');
        if (!elForm.reportValidity()) {
          return;
        }
        const formData = new FormData(elForm);
        const title = formData.get('title')?.toString() ?? '';
        const dateStartStr = formData.get('startDate')?.toString() ?? '';
        const dateEndStr = formData.get('endDate')?.toString() ?? '';
        const timeZone = formData.get('timeZone')?.toString() ?? '';

        const dateStartDateTime =
          getDateTimeFromDateInput(dateStartStr).setZone(timeZone);
        const dateEndDateTime = dateStartDateTime.plus({
          days: 1,
        });
        console.log('TripForm', {
          mode,
          location,
          tripId,
          title,
          timeZone,
          dateStartStr,
          dateEndStr,
          dateStartDateTime,
          dateEndDateTime,
        });
        if (!title || !dateStartStr || !dateEndStr) {
          return;
        }
        if (dateEndDateTime.diff(dateStartDateTime).as('minute') < 0) {
          setErrorMessage(`End date must be after start date`);
          return;
        }
        if (mode === TripFormMode.Edit && tripId) {
          dbUpdateTrip({
            id: tripId,
            title,
            timeZone,
            timestampStart: dateStartDateTime.toMillis(),
            timestampEnd: dateEndDateTime.toMillis(),
          });
          publishToast({
            root: {},
            title: { children: `Trip ${title} edited` },
            close: {},
          });
        } else if (mode === TripFormMode.New && userId) {
          dbAddTrip(
            {
              title,
              timeZone,
              timestampStart: dateStartDateTime.toMillis(),
              timestampEnd: dateEndDateTime.toMillis(),
            },
            {
              userId,
            }
          );

          publishToast({
            root: {},
            title: { children: `Trip ${title} added` },
            close: {},
          });
        }
        elForm.reset();
        setDialogOpen(false);
      }}
    >
      <Flex direction="column" gap="2">
        <Text color="red" size="2">
          {errorMessage}&nbsp;
        </Text>
        <Text as="label" htmlFor={idTitle}>
          Trip name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={tripTitle}
          placeholder="Enter trip name"
          name="title"
          type="text"
          id={idTitle}
          required
        />
        <Text as="label" htmlFor={idTimeStart}>
          Start date{' '}
          <Text weight="light" size="1">
            (first day of trip; required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeStart}
          name="startDate"
          type="date"
          defaultValue={tripStartStr}
          required
        />
        <Text as="label" htmlFor={idTimeEnd}>
          End date{' '}
          <Text weight="light" size="1">
            (final day of trip; required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeEnd}
          name="endDate"
          type="date"
          defaultValue={tripEndStr}
          required
        />
        <Text as="label" htmlFor={idTimeZone}>
          Time zone
        </Text>

        <Select.Root name="timeZone" defaultValue={tripTimeZone}>
          <Select.Trigger id={idTimeZone} />
          <Select.Content>
            {timeZones.map((tz) => {
              return <Select.Item value={tz}>{tz}</Select.Item>;
            })}
          </Select.Content>
        </Select.Root>
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
