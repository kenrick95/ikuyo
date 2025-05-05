import { Button, Dialog, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';

import { type RouteComponentProps, useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import {
  ROUTES,
  ROUTES_TRIP,
  ROUTES_TRIP_DIALOGS,
  asRootRoute,
} from '../Routes/routes';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import { db } from '../data/db';
import s from './Accommodation.module.css';
import type { DbAccommodationWithTrip } from './db';

export function AccommodationViewDialog({
  params,
}: RouteComponentProps<{ id: string }>) {
  const { id: accommodationId } = params;
  const [location, setLocation] = useLocation();
  const { data } = db.useQuery({
    accommodation: {
      trip: {},
      $: {
        where: {
          id: accommodationId,
        },
      },
    },
  });
  const accommodation = data?.accommodation[0] as
    | DbAccommodationWithTrip
    | undefined;

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
    <Dialog.Root
      defaultOpen
      onOpenChange={(open) => {
        if (!open && accommodation) {
          setLocation(
            location.includes(ROUTES_TRIP.ListView)
              ? asRootRoute(
                  ROUTES.Trip.asRoute(accommodation.trip.id) +
                    ROUTES_TRIP.ListView,
                )
              : location.includes(ROUTES_TRIP.TimetableView)
                ? asRootRoute(
                    ROUTES.Trip.asRoute(accommodation.trip.id) +
                      ROUTES_TRIP.TimetableView,
                  )
                : asRootRoute(ROUTES.Trip.asRoute(accommodation.trip.id)),
          );
        }
      }}
    >
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
              <Text className={s.activityDescription}>{notes}</Text>
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
              setLocation(
                ROUTES_TRIP_DIALOGS.AccommodationEdit.asRoute(accommodationId),
              );
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
              setLocation(
                ROUTES_TRIP_DIALOGS.AccommodationEdit.asRoute(accommodationId),
              );
            }}
          >
            Edit
          </Button>
          <Dialog.Close>
            <Button type="button" size="2">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
