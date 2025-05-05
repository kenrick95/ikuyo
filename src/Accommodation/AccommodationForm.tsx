import { Button, Flex, Text, TextArea, TextField } from '@radix-ui/themes';
import { useCallback, useId, useState } from 'react';
import { useBoundStore } from '../data/store';
import { dangerToken } from '../ui';
import { AccommodationFormMode } from './AccommodationFormMode';
import { dbAddAccommodation, dbUpdateAccommodation } from './db';
import { getDateTimeFromDatetimeLocalInput } from './time';

export function AccommodationForm({
  mode,
  accommodationId,
  tripId,

  tripTimeZone,
  tripStartStr,
  tripEndStr,

  accommodationName,
  accommodationAddress,
  accommodationCheckInStr,
  accommodationCheckOutStr,
  accommodationPhoneNumber,
  accommodationNotes,

  closeDialogFromSuccess,
  closeDialogFromCancel,
}: {
  mode: AccommodationFormMode;

  tripId?: string;
  accommodationId?: string;

  tripTimeZone: string;
  tripStartStr: string;
  tripEndStr: string;

  accommodationName: string;
  accommodationAddress: string;
  accommodationCheckInStr: string;
  accommodationCheckOutStr: string;
  accommodationPhoneNumber: string;
  accommodationNotes: string;

  closeDialogFromCancel: () => void;
  closeDialogFromSuccess: () => void;
}) {
  const idName = useId();
  const idTimeCheckIn = useId();
  const idTimeCheckOut = useId();
  const idAddress = useId();
  const idPhoneNumber = useId();
  const idNotes = useId(); 
  const publishToast = useBoundStore((state) => state.publishToast);

  const [errorMessage, setErrorMessage] = useState('');

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
      const address = (formData.get('address') as string | null) ?? '';
      const phoneNumber = (formData.get('phoneNumber') as string | null) ?? '';
      const notes = (formData.get('notes') as string | null) ?? '';
      const timeCheckInString =
        (formData.get('timeCheckIn') as string | null) ?? '';
      const timeCheckOutString =
        (formData.get('timeCheckOut') as string | null) ?? '';
      const timeCheckInDate = getDateTimeFromDatetimeLocalInput(
        timeCheckInString,
        tripTimeZone,
      );
      const timeCheckOutDate = getDateTimeFromDatetimeLocalInput(
        timeCheckOutString,
        tripTimeZone,
      );
      console.log('AccommodationForm', {
        mode,
        accommodationId,
        tripId,
        name,
        address,
        phoneNumber,
        notes,
        timeCheckInString,
        timeCheckOutString,
        timeCheckInDate,
        timeCheckOutDate,
      });
      if (!name || !timeCheckInString || !timeCheckOutString) {
        return;
      }
      if (timeCheckOutDate.diff(timeCheckInDate).as('minute') < 0) {
        setErrorMessage('Check out time must be after check in time');
        return;
      }
      if (mode === AccommodationFormMode.Edit && accommodationId) {
        await dbUpdateAccommodation({
          id: accommodationId,
          name,
          address,
          timestampCheckIn: timeCheckInDate.toMillis(),
          timestampCheckOut: timeCheckOutDate.toMillis(),
          phoneNumber,
          notes,
        });
        publishToast({
          root: {},
          title: { children: `Accommodation ${name} updated` },
          close: {},
        });
      } else if (mode === AccommodationFormMode.New && tripId) {
        const { id, result } = await dbAddAccommodation(
          {
            name,
            address,
            timestampCheckIn: timeCheckInDate.toMillis(),
            timestampCheckOut: timeCheckOutDate.toMillis(),
            phoneNumber,
            notes,
          },
          {
            tripId: tripId,
          },
        );
        console.log('AccommodationForm: dbAddAccommodation', { id, result });
        publishToast({
          root: {},
          title: { children: `Accommodation ${name} added` },
          close: {},
        });
      }

      elForm.reset();
      closeDialogFromSuccess();
    };
  }, [accommodationId, mode, publishToast, closeDialogFromSuccess, tripId, tripTimeZone]);

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
          Accommodation name{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          defaultValue={accommodationName}
          placeholder="Enter accommodation name (e.g. Hotel California, etc.)"
          name="name"
          type="text"
          id={idName}
          required
        />
        <Text as="label" htmlFor={idAddress}>
          Address
        </Text>
        <TextArea
          defaultValue={accommodationAddress}
          placeholder="Enter accommodation address"
          name="address"
          id={idAddress}
          style={{ minHeight: 80 }}
        />
        <Text as="label" htmlFor={idTimeCheckIn}>
          Check in time{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeCheckIn}
          name="timeCheckIn"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={accommodationCheckInStr}
          required
        />
        <Text as="label" htmlFor={idTimeCheckOut}>
          Check out time{' '}
          <Text weight="light" size="1">
            (required)
          </Text>
        </Text>
        <TextField.Root
          id={idTimeCheckOut}
          name="timeCheckOut"
          type="datetime-local"
          min={tripStartStr}
          max={tripEndStr}
          defaultValue={accommodationCheckOutStr}
          required
        />
        <Text as="label" htmlFor={idPhoneNumber}>
          Phone number
        </Text>
        <TextField.Root
          defaultValue={accommodationPhoneNumber}
          placeholder="Enter accommodation's phone number"
          name="phoneNumber"
          id={idPhoneNumber}
          type="tel"
        />
        <Text as="label" htmlFor={idNotes}>
          Notes
        </Text>
        <TextArea
          defaultValue={accommodationNotes}
          placeholder="Any notes on the accommodation?"
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
          onClick={closeDialogFromCancel}
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
