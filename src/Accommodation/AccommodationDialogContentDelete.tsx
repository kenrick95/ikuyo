import { Button, Dialog, Flex, Skeleton } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { useBoundStore } from '../data/store';
import type { TripSliceAccommodation } from '../Trip/store/types';
import { dangerToken } from '../ui';
import { AccommodationDialogMode } from './AccommodationDialogMode';
import { dbDeleteAccommodation } from './db';

export function AccommodationDialogContentDelete({
  data: accommodation,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceAccommodation>) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const deleteAccommodation = useCallback(() => {
    if (!accommodation) {
      return;
    }
    void dbDeleteAccommodation(accommodation.id, accommodation.tripId)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Accommodation "${accommodation.name}" deleted` },
          close: {},
        });

        setLocation('');
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${accommodation.name}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${accommodation.name}"` },
          close: {},
        });
      });
  }, [publishToast, accommodation, setLocation]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Delete Accommodation" />
      <Dialog.Description size="2">
        Are you sure to delete accommodation "
        {accommodation?.name ?? <Skeleton>Hotel ABC</Skeleton>}"?
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
