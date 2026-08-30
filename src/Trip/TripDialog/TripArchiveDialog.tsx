import { AlertDialog, Button, Flex, Text } from '@radix-ui/themes';
import { useCallback, useState } from 'react';
import { CommonDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import { dbSetTripArchived } from '../db';
import type { TripSliceTrip } from '../store/types';

export function TripArchiveDialog({ trip }: { trip: TripSliceTrip }) {
  const archived = trip.archivedAt != null;
  const popDialog = useBoundStore((state) => state.popDialog);
  const publishToast = useBoundStore((state) => state.publishToast);
  const [submitting, setSubmitting] = useState(false);
  const submit = useCallback(() => {
    setSubmitting(true);
    void dbSetTripArchived(trip.id, !archived)
      .then(() => {
        publishToast({
          root: {},
          title: {
            children: archived
              ? `Trip "${trip.title}" unarchived`
              : `Trip "${trip.title}" archived`,
          },
          close: {},
        });
        popDialog();
      })
      .catch((error: unknown) => {
        console.error(
          `Error updating archive state for "${trip.title}"`,
          error,
        );
        publishToast({
          root: {},
          title: { children: 'Unable to update trip archive state' },
          close: {},
        });
        setSubmitting(false);
      });
  }, [archived, popDialog, publishToast, trip.id, trip.title]);

  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Content maxWidth={CommonDialogMaxWidth}>
        <AlertDialog.Title>
          {archived ? 'Unarchive trip' : 'Archive trip'}
        </AlertDialog.Title>
        <AlertDialog.Description size="2">
          {archived ? (
            <Text as="p">
              Unarchive "{trip.title}"? Its content will become editable again
              for owners and editors.
            </Text>
          ) : (
            <Text as="p">
              Archive "{trip.title}"? Its content will become read-only.
              Sharing, members, and deletion will remain available to owners.
            </Text>
          )}
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel onClick={popDialog}>
            <Button variant="soft" color="gray" disabled={submitting}>
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action onClick={submit}>
            <Button loading={submitting}>
              {archived ? 'Unarchive trip' : 'Archive trip'}
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
