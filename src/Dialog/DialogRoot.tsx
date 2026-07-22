import { Button, Dialog, Flex } from '@radix-ui/themes';
import { dangerToken } from '../common/ui';
import { useDeepBoundStore } from '../data/store';
import { CommonDialogMaxWidth } from './ui';

function ConfirmPopDialog() {
  const cancelConfirmPopDialog = useDeepBoundStore(
    (state) => state.cancelConfirmPopDialog,
  );
  const confirmPopDialog = useDeepBoundStore((state) => state.confirmPopDialog);
  const isConfirmingPopDialogActive = useDeepBoundStore(
    (state) => state.isConfirmingPopDialogActive,
  );
  return (
    <Dialog.Root open={isConfirmingPopDialogActive}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>Discard unsaved changes?</Dialog.Title>
        <Dialog.Description size="2">
          If you close now, your changes will be lost.
        </Dialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <Button
            variant="soft"
            color="gray"
            onClick={cancelConfirmPopDialog}
            autoFocus
          >
            Keep editing
          </Button>
          <Button
            variant="solid"
            color={dangerToken}
            onClick={confirmPopDialog}
          >
            Discard changes
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export function DialogRoot() {
  const dialogs = useDeepBoundStore((state) => state.dialogs);

  if (dialogs.length > 0) {
    const DialogComponent = dialogs[dialogs.length - 1].component;
    const dialogProps = dialogs[dialogs.length - 1].props;
    return (
      <>
        <DialogComponent {...dialogProps} />
        <ConfirmPopDialog />
      </>
    );
  }
  return null;
}
