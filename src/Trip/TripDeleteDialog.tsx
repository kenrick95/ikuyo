import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { RouteTrips } from '../Routes/routes';
import { dangerToken } from '../ui';
import { dbDeleteTrip } from './db';
import type { TripSliceTrip } from './store';

export function TripDeleteDialog({ trip }: { trip: TripSliceTrip }) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const popDialog = useBoundStore((state) => state.popDialog);
  const clearDialogs = useBoundStore((state) => state.clearDialogs);
  const deleteTrip = useCallback(() => {
    void dbDeleteTrip(trip)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Trip "${trip.title}" deleted` },
          close: {},
        });
        clearDialogs();

        setLocation(RouteTrips.asRootRoute());
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${trip.title}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${trip.title}"` },
          close: {},
        });
        popDialog();
      });
  }, [setLocation, publishToast, trip, popDialog, clearDialogs]);

  return (
    <AlertDialog.Root defaultOpen>
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
          <AlertDialog.Cancel onClick={popDialog}>
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
