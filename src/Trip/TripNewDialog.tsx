import { Dialog, Box } from '@radix-ui/themes';
import { DbUser } from '../data/types';
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
      <Dialog.Content maxWidth="450px">
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
          userId={user.id}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
