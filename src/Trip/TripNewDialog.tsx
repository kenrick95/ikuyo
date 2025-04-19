import { Box, Dialog } from '@radix-ui/themes';
import type { DbUser } from '../data/types';
import { CommonDialogMaxWidth } from '../dialog';
import { TripForm } from './TripForm';
import { TripFormMode } from './TripFormMode';

export function TripNewDialog({
  dialogOpen,
  setDialogOpen,
  user,
}: {
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
  user: DbUser;
}) {
  const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>New Trip</Dialog.Title>
        <Dialog.Description>
          Fill in your new trip details...
        </Dialog.Description>
        <Box height="16px" />
        <TripForm
          mode={TripFormMode.New}
          tripStartStr={''}
          tripEndStr={''}
          tripTitle={''}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          tripTimeZone={currentTimeZone}
          tripCurrency=""
          tripOriginCurrency=""
          userId={user.id}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
