import { Button, Dialog, Flex } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import { CommonDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { dangerToken } from '../ui';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';
import { type DbAccommodationWithTrip, dbDeleteAccommodation } from './db';

export function AccommodationDialogContentDelete({
  accommodation,
  setMode,
}: {
  accommodation: DbAccommodationWithTrip;
  setMode: (mode: AccommodationDialogModeType) => void;
}) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const popDialog = useBoundStore((state) => state.popDialog);
  const clearDialogs = useBoundStore((state) => state.clearDialogs);
  const deleteAccommodation = useCallback(() => {
    void dbDeleteAccommodation(accommodation)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Accommodation "${accommodation.name}" deleted` },
          close: {},
        });

        clearDialogs();
        setLocation('');
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${accommodation.name}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${accommodation.name}"` },
          close: {},
        });
        popDialog();
      });
  }, [publishToast, accommodation, popDialog, setLocation, clearDialogs]);

  return (
    <Dialog.Content maxWidth={CommonDialogMaxWidth}>
      <Dialog.Title>Delete Accommodation</Dialog.Title>
      <Dialog.Description size="2">
        Are you sure to delete accommodation "{accommodation.name}"?
      </Dialog.Description>

      <Flex gap="3" mt="4" justify="end">
        <Button
          variant="soft"
          color="gray"
          onClick={() => {
            setMode(AccommodationDialogMode.View);
          }}
        >
          Cancel
        </Button>
        <Button
          variant="solid"
          color={dangerToken}
          onClick={deleteAccommodation}
        >
          Delete
        </Button>
      </Flex>
    </Dialog.Content>
  );
}
