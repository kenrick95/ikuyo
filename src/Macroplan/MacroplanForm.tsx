import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import type { SubmitEvent } from 'react';
import { useCallback, useId, useState } from 'react';
import { DateTimePicker } from '../common/DatePicker2/DateTimePicker';
import { DateTimePickerMode } from '../common/DatePicker2/DateTimePickerMode';
import { TimeZoneSelect } from '../common/TimeZoneSelect/TimeZoneSelect';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import { dbAddMacroplan, dbUpdateMacroplan } from './db';
import {
  MacroplanFormMode,
  type MacroplanFormModeType,
} from './MacroplanFormMode';

export function MacroplanForm({
  mode,
  macroplanId,
  tripId,

  tripTimeZone,
  tripStartDate,
  tripEndDate,

  macroplanName,
  macroplanStartDate,
  macroplanEndDate,
  macroplanStartTimeZone,
  macroplanEndTimeZone,
  macroplanNotes,

  onFormSuccess,
  onFormCancel,
}: {
  mode: MacroplanFormModeType;

  tripId?: string;
  macroplanId?: string;

  tripTimeZone: string;
  tripStartDate: Temporal.PlainDate | undefined;
  tripEndDate: Temporal.PlainDate | undefined;

  macroplanName: string;
  macroplanStartDate: Temporal.PlainDate | undefined;
  macroplanEndDate: Temporal.PlainDate | undefined;
  macroplanStartTimeZone: string | undefined;
  macroplanEndTimeZone: string | undefined;
  macroplanNotes: string;

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idName = useId();
  const idNotes = useId();

  const publishToast = useBoundStore((state) => state.publishToast);

  const [errorMessage, setErrorMessage] = useState('');
  const [dateStart, setDateStart] = useState<Temporal.PlainDate | undefined>(
    macroplanStartDate,
  );
  const [dateEnd, setDateEnd] = useState<Temporal.PlainDate | undefined>(
    macroplanEndDate,
  );
  const [timeZoneStart, setTimeZoneStart] = useState<string>(
    macroplanStartTimeZone ?? tripTimeZone,
  );
  const [timeZoneEnd, setTimeZoneEnd] = useState<string>(
    macroplanEndTimeZone ?? tripTimeZone,
  );

  const handleStartDateChange = useCallback(
    (dateTime: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      if (dateTime instanceof Temporal.PlainDateTime) {
        setDateStart(dateTime.toPlainDate());
      } else {
        setDateStart(dateTime);
      }
      setErrorMessage(''); // Clear any date-related errors
    },
    [],
  );

  const handleEndDateChange = useCallback(
    (dateTime: Temporal.PlainDate | Temporal.PlainDateTime | undefined) => {
      if (dateTime instanceof Temporal.PlainDateTime) {
        setDateEnd(dateTime.toPlainDate());
      } else {
        setDateEnd(dateTime);
      }
      setErrorMessage(''); // Clear any date-related errors
    },
    [],
  );

  const handleTimeZoneStartChange = useCallback((newTimeZone: string) => {
    setTimeZoneStart(newTimeZone);
  }, []);

  const handleTimeZoneEndChange = useCallback((newTimeZone: string) => {
    setTimeZoneEnd(newTimeZone);
  }, []);

  const handleSubmit = useCallback(() => {
    return async (elForm: HTMLFormElement) => {
      setErrorMessage('');
      // TIL: https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity
      // HTMLInputElement.setCustomValidity()
      // seems quite hard to use... need to call setCustomValidity again after invalid, before "submit" event
      if (!elForm.reportValidity()) {
        return;
      }
      const formData = new FormData(elForm);
      const name = (formData.get('name') as string | null) ?? '';
      const notes = (formData.get('notes') as string | null) ?? '';
      const dateStartDateTime = dateStart;
      const dateEndDateTime = dateEnd?.add({ days: 1 });
      console.log('MacroplanForm', {
        mode,
        macroplanId,
        tripId,
        name,
        notes,
        dateStartDateTime,
        dateEndDateTime,
      });
      if (!name || !dateStartDateTime || !dateEndDateTime) {
        return;
      }
      if (Temporal.PlainDate.compare(dateStartDateTime, dateEndDateTime) > 0) {
        setErrorMessage('End date must not be before start date');
        return;
      }
      // start date cannot be earlier than trip start date
      if (
        tripStartDate &&
        Temporal.PlainDate.compare(dateStartDateTime, tripStartDate) < 0
      ) {
        setErrorMessage('Start date cannot be earlier than trip start date');
        return;
      }
      // end date cannot be later than trip end date
      // in db, the convention for 'end date' date-level entities are that they stored as start of next day
      // TODO: validate this assumption
      // however, tripEndDateTime prop has been adjusted to be the last minute of the trip
      if (
        tripEndDate &&
        Temporal.PlainDate.compare(dateEndDateTime, tripEndDate) > 0
      ) {
        setErrorMessage('End date cannot be later than trip end date');
        return;
      }
      if (mode === MacroplanFormMode.Edit && macroplanId) {
        await dbUpdateMacroplan({
          id: macroplanId,
          name,
          timestampStart:
            dateStartDateTime.toZonedDateTime(timeZoneStart).epochMilliseconds,
          timestampEnd:
            dateEndDateTime.toZonedDateTime(timeZoneStart).epochMilliseconds,
          timeZoneStart: timeZoneStart,
          timeZoneEnd: timeZoneEnd,
          notes,
        });
        publishToast({
          root: {},
          title: { children: `Day plan ${name} updated` },
          close: {},
        });
      } else if (mode === MacroplanFormMode.New && tripId) {
        const { id, result } = await dbAddMacroplan(
          {
            name,
          timestampStart:
            dateStartDateTime.toZonedDateTime(timeZoneStart).epochMilliseconds,
          timestampEnd:
            dateEndDateTime.toZonedDateTime(timeZoneStart).epochMilliseconds,
          timeZoneStart: timeZoneStart,
          timeZoneEnd: timeZoneEnd,
            notes,
          },
          {
            tripId: tripId,
          },
        );
        console.log('MacroplanForm: dbAddMacroplan', { id, result });
        publishToast({
          root: {},
          title: { children: `Day plan ${name} added` },
          close: {},
        });
      }

      elForm.reset();
      onFormSuccess();
    };
  }, [
    macroplanId,
    mode,
    publishToast,
    onFormSuccess,
    tripId,
    dateStart,
    dateEnd,
    tripStartDate,
    tripEndDate,
    timeZoneStart,
    timeZoneEnd,
  ]);

  const onFormInput = useCallback(() => {
    setErrorMessage('');
  }, []);

  const onFormSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const elForm = event.currentTarget;
      void handleSubmit()(elForm);
    },
    [handleSubmit],
  );

  return (
    <form onInput={onFormInput} onSubmit={onFormSubmit}>
      <Flex direction="column" gap="2">
        <Text as="label" htmlFor={idName}>
          Day plan <br />
          <Text weight="light" size="1">
            (required, e.g. Visit Zoo, Arrival Day, Travel to Next City)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={macroplanName}
          placeholder="Enter the plan"
          name="name"
          type="text"
          id={idName}
          required
        />
        <Text as="label">
          Start date time zone{' '}
          <Text weight="light" size="1">
            (trip default time zone is {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneStart"
          name="timeZoneStart"
          value={timeZoneStart}
          handleChange={handleTimeZoneStartChange}
          isFormLoading={false}
        />
        <Text as="label">
          Start date{' '}
          <Text weight="light" size="1">
            (required; in {timeZoneStart} time zone)
          </Text>
        </Text>
        <DateTimePicker
          value={dateStart}
          onChange={handleStartDateChange}
          mode={DateTimePickerMode.Date}
          name="startDate"
          required
          aria-label="Day plan start date"
          placeholder="Select start date"
          // Buffer one day before and after trip start/end date to allow some flexibility
          min={tripStartDate?.subtract({ days: 1 })}
          max={tripEndDate?.add({ days: 1 })}
        />

        <Text as="label">
          End date time zone{' '}
          <Text weight="light" size="1">
            (trip default time zone is {tripTimeZone})
          </Text>
        </Text>
        <TimeZoneSelect
          id="timeZoneEnd"
          name="timeZoneEnd"
          value={timeZoneEnd}
          handleChange={handleTimeZoneEndChange}
          isFormLoading={false}
        />
        <Text as="label">
          End date{' '}
          <Text weight="light" size="1">
            (required; in {timeZoneEnd} time zone)
          </Text>
        </Text>
        <DateTimePicker
          value={dateEnd}
          onChange={handleEndDateChange}
          mode={DateTimePickerMode.Date}
          name="endDate"
          required
          aria-label="Day plan end date"
          placeholder="Select end date"
          // Buffer one day before and after trip start/end date to allow some flexibility
          min={tripStartDate?.subtract({ days: 1 })}
          max={tripEndDate?.add({ days: 1 })}
        />
        <Text as="label" htmlFor={idNotes}>
          Notes
        </Text>
        <TextArea
          defaultValue={macroplanNotes}
          placeholder="Any notes on the plan?"
          name="notes"
          id={idNotes}
          style={{ minHeight: 240 }}
        />
      </Flex>
      <Flex mt="5" justify="end">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
      </Flex>
      <Flex gap="3" mt="2" justify="end">
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={onFormCancel}
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
