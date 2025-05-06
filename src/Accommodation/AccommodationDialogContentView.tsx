import { Button, Dialog, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';
import type { DbAccommodationWithTrip } from './db';

export function AccommodationDialogContentView({
  accommodation,
  setMode,
}: {
  accommodation: DbAccommodationWithTrip;
  setMode: (mode: AccommodationDialogModeType) => void;
}) {
  const [, setLocation] = useLocation();
  const accommodationCheckInStr = accommodation
    ? DateTime.fromMillis(accommodation.timestampCheckIn)
        .setZone(accommodation.trip.timeZone)
        .toFormat('dd LLLL yyyy HH:mm')
    : '';
  const accommodationCheckOutStr = accommodation
    ? DateTime.fromMillis(accommodation.timestampCheckOut)
        .setZone(accommodation.trip.timeZone)
        .toFormat('dd LLLL yyyy HH:mm')
    : '';
  const notes = useParseTextIntoNodes(accommodation?.notes);
  return (
    <Dialog.Content maxWidth={CommonDialogMaxWidth}>
      <Dialog.Title>View Accommodation</Dialog.Title>
      <Dialog.Description>Accommodation details</Dialog.Description>
      <Flex direction="column" gap="3" mt="3">
        <Heading as="h2" size="4">
          Name
        </Heading>
        <Text>{accommodation?.name}</Text>
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
      <Flex gap="3" mt="5" justify="end">
        <Button
          mr="auto"
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={() => {
            setMode(AccommodationDialogMode.Delete);
          }}
        >
          Delete
        </Button>
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={() => {
            setMode(AccommodationDialogMode.Edit);
          }}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="2"
          onClick={() => {
            setLocation('');
          }}
        >
          Close
        </Button>
      </Flex>
    </Dialog.Content>
  );
}
