import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { useBoundStore } from '../data/store';
import { CommonDialogMaxWidth } from '../dialog';
import { ROUTES } from '../routes';
import { dangerToken } from '../ui';
import { type DbTripWithActivityAccommodation, dbDeleteTrip } from './db';

export function TripDeleteDialog({
  trip,
  dialogOpen,
  setDialogOpen,
}: {
  trip: DbTripWithActivityAccommodation;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const deleteTrip = useCallback(() => {
    void dbDeleteTrip(trip)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Trip "${trip.title}" deleted` },
          close: {},
        });

        setDialogOpen(false);

        setLocation(ROUTES.Trips);
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${trip.title}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${trip.title}"` },
          close: {},
        });
        setDialogOpen(false);
      });
  }, [setLocation, publishToast, trip, setDialogOpen]);

  return (
    <AlertDialog.Root
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      defaultOpen={dialogOpen}
    >
      <AlertDialog.Content maxWidth={CommonDialogMaxWidth}>
        <AlertDialog.Title>Delete Trip</AlertDialog.Title>
        <AlertDialog.Description size="2">
          <Text as="p">Are you sure to delete trip "{trip.title}"?</Text>
          <Text as="p">
            This will also delete all the associated activites in this trip.
          </Text>
          <Text as="p" color={dangerToken}>
            This action is irreversible!
          </Text>
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action onClick={deleteTrip}>
            <Button variant="solid" color={dangerToken}>
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
