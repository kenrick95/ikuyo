import { AlertDialog, Flex, Button } from '@radix-ui/themes';
import { useCallback } from 'react';
import { dbDeleteActivity } from '../data/db';
import { useBoundStore } from '../data/store';
import { DbActivity } from '../data/types';
import { CommonDialogMaxWidth } from '../dialog';

export function ActivityDeleteDialog({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const publishToast = useBoundStore((state) => state.publishToast);
  const deleteActivity = useCallback(() => {
    void dbDeleteActivity(activity)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Activity "${activity.title}" deleted` },
          close: {},
        });

        setDialogOpen(false);
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${activity.title}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${activity.title}"` },
          close: {},
        });
        setDialogOpen(false);
      });
  }, [publishToast, activity, setDialogOpen]);

  return (
    <AlertDialog.Root
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      defaultOpen={dialogOpen}
    >
      <AlertDialog.Content maxWidth={CommonDialogMaxWidth}>
        <AlertDialog.Title>Delete Activity</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Are you sure to delete activity "{activity.title}"?
        </AlertDialog.Description>

        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action onClick={deleteActivity}>
            <Button variant="solid" color="red">
              Delete
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
