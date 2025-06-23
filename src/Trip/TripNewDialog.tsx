import { Box, Dialog } from '@radix-ui/themes';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import type { DbUser } from '../data/types';
import { TripForm } from './TripForm';
import { TripFormMode } from './TripFormMode';
import { TripSharingLevel } from './tripSharingLevel';

export function TripNewDialog({ user }: { user: DbUser }) {
  const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const popDialog = useBoundStore((state) => state.popDialog);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>New Trip</Dialog.Title>
        <Dialog.Description size="2">
          Fill in your new trip details...
        </Dialog.Description>
        <Box height="16px" />
        <TripForm
          mode={TripFormMode.New}
          tripStartStr={''}
          tripEndStr={''}
          tripTitle={''}
          tripTimeZone={currentTimeZone}
          tripCurrency=""
          tripOriginCurrency=""
          tripRegions={[]}
          tripSharingLevel={TripSharingLevel.Private}
          userId={user.id}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
