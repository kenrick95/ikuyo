import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import { useCallback, useId, useState } from 'react';
import { DateRangePicker } from '../common/DateRangePicker/DateRangePicker';
import { dangerToken } from '../common/ui';
import { useBoundStore } from '../data/store';
import { dbAddMacroplan, dbUpdateMacroplan } from './db';
import {
  MacroplanFormMode,
  type MacroplanFormModeType,
} from './MacroplanFormMode';
import { getDateTimeFromDateInput } from './time';

export function MacroplanForm({
  mode,
  macroplanId,
  tripId,

  tripTimeZone,
  tripStartStr,
  tripEndStr,

  macroplanName,
  macroplanDateStartStr,
  macroplanDateEndStr,
  macroplanNotes,

  onFormSuccess,
  onFormCancel,
}: {
  mode: MacroplanFormModeType;

  tripId?: string;
  macroplanId?: string;

  tripTimeZone: string;
  tripStartStr: string;
  tripEndStr: string;

  macroplanName: string;
  macroplanDateStartStr: string;
  macroplanDateEndStr: string;
  macroplanNotes: string;

  onFormSuccess: () => void;
  onFormCancel: () => void;
}) {
  const idName = useId();
  const idNotes = useId();

  const publishToast = useBoundStore((state) => state.publishToast);

  const [errorMessage, setErrorMessage] = useState('');
  const [dateStart, setDateStart] = useState(macroplanDateStartStr);
  const [dateEnd, setDateEnd] = useState(macroplanDateEndStr);

  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      setDateStart(startDate);
      setDateEnd(endDate);
      setErrorMessage(''); // Clear any date-related errors
    },
    [],
  );

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
      const dateStartStr = dateStart;
      const dateEndStr = dateEnd;
      const dateStartDateTime = getDateTimeFromDateInput(
        dateStartStr,
        tripTimeZone,
      );
      const dateEndDateTime = getDateTimeFromDateInput(
        dateEndStr,
        tripTimeZone,
      ).plus({ day: 1 });
      console.log('MacroplanForm', {
        mode,
        macroplanId,
        tripId,
        name,
        notes,
        timeStartString: dateStartStr,
        timeEndString: dateEndStr,
        timeStartDateTime: dateStartDateTime,
        timeEndDateTime: dateEndDateTime,
      });
      if (!name || !dateStartStr || !dateEndStr) {
        return;
      }
      if (dateEndDateTime.diff(dateStartDateTime).as('minute') < 0) {
        setErrorMessage('End date must not be before start date');
        return;
      }
      if (mode === MacroplanFormMode.Edit && macroplanId) {
        await dbUpdateMacroplan({
          id: macroplanId,
          name,
          timestampStart: dateStartDateTime.toMillis(),
          timestampEnd: dateEndDateTime.toMillis(),
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
            timestampStart: dateStartDateTime.toMillis(),
            timestampEnd: dateEndDateTime.toMillis(),
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
    tripTimeZone,
    dateStart,
    dateEnd,
  ]);

  return (
    <form
      onInput={() => {
        setErrorMessage('');
      }}
      onSubmit={(e) => {
        e.preventDefault();
        const elForm = e.currentTarget;
        void handleSubmit()(elForm);
      }}
    >
      <Flex direction="column" gap="2">
        <Text color={dangerToken} size="2">
          {errorMessage}&nbsp;
        </Text>
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
          Date range{' '}
          <Text weight="light" size="1">
            (required; in {tripTimeZone} time zone)
          </Text>
        </Text>
        <DateRangePicker
          startDate={dateStart}
          endDate={dateEnd}
          min={tripStartStr}
          max={tripEndStr}
          onRangeChange={handleDateRangeChange}
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
      <Flex gap="3" mt="5" justify="end">
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
