import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { type TripSliceAccommodation, useTrip } from '../Trip/store';
import { AccommodationDialogMode } from './AccommodationDialogMode';

export function AccommodationDialogContentView({
  data: accommodation,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceAccommodation>) {
  const trip = useTrip(accommodation?.tripId);
  const accommodationCheckInStr =
    accommodation && trip
      ? DateTime.fromMillis(accommodation.timestampCheckIn)
          .setZone(trip.timeZone)
          .toFormat('dd LLLL yyyy HH:mm')
      : '';
  const accommodationCheckOutStr =
    accommodation && trip
      ? DateTime.fromMillis(accommodation.timestampCheckOut)
          .setZone(trip.timeZone)
          .toFormat('dd LLLL yyyy HH:mm')
      : '';
  const notes = useParseTextIntoNodes(accommodation?.notes);

  const goToEditMode = useCallback(() => {
    setMode(AccommodationDialogMode.Edit);
  }, [setMode]);
  const goToDeleteMode = useCallback(() => {
    setMode(AccommodationDialogMode.Delete);
  }, [setMode]);
  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="View Accommodation" />
      <Flex gap="3" mb="3" justify="start">
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={goToEditMode}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={goToDeleteMode}
        >
          Delete
        </Button>
      </Flex>
      <Dialog.Description size="2">Accommodation details</Dialog.Description>
      <Flex direction="column" gap="3" mt="3">
        <Heading as="h2" size="4">
          Name
        </Heading>
        <Text>{accommodation?.name ?? <Skeleton>Hotel ABC</Skeleton>}</Text>
        <Heading as="h2" size="4">
          Check In
        </Heading>
        <Text>{accommodationCheckInStr}</Text>
        <Heading as="h2" size="4">
          Check Out
        </Heading>
        <Text>{accommodationCheckOutStr}</Text>

        {accommodation?.address ? (
          <>
            <Heading as="h2" size="4">
              Address
            </Heading>
            <Text>{accommodation.address}</Text>
          </>
        ) : (
          <></>
        )}
        {accommodation?.phoneNumber ? (
          <>
            <Heading as="h2" size="4">
              Phone Number
            </Heading>
            <Text>{accommodation.phoneNumber}</Text>
          </>
        ) : (
          <></>
        )}
        {accommodation?.notes ? (
          <>
            <Heading as="h2" size="4">
              Notes
            </Heading>
            <Text style={{ whiteSpace: 'pre-wrap' }}>{notes}</Text>
          </>
        ) : (
          <></>
        )}
      </Flex>
    </Dialog.Content>
  );
}
