import { Button, Dialog, Flex, Skeleton } from '@radix-ui/themes';
import { useCallback } from 'react';
import { useLocation } from 'wouter';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { useBoundStore } from '../data/store';
import type { TripSliceMacroplan } from '../Trip/store/types';
import { dangerToken } from '../ui';
import { dbDeleteMacroplan } from './db';
import { MacroplanDialogMode } from './MacroplanDialogMode';

export function MacroplanDialogContentDelete({
  data: macroplan,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceMacroplan>) {
  const [, setLocation] = useLocation();
  const publishToast = useBoundStore((state) => state.publishToast);
  const deleteMacroplan = useCallback(() => {
    if (!macroplan) {
      console.error('No macroplan to delete');
      return;
    }
    void dbDeleteMacroplan(macroplan.id, macroplan.tripId)
      .then(() => {
        publishToast({
          root: {},
          title: { children: `Macroplan "${macroplan.name}" deleted` },
          close: {},
        });

        setLocation('');
      })
      .catch((err: unknown) => {
        console.error(`Error deleting "${macroplan.name}"`, err);
        publishToast({
          root: {},
          title: { children: `Error deleting "${macroplan.name}"` },
          close: {},
        });
      });
  }, [publishToast, macroplan, setLocation]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Delete Day Plan" />
      <Dialog.Description size="2">
        Are you sure to delete day plan "
        {macroplan?.name ?? <Skeleton>Day plan</Skeleton>}"?
      </Dialog.Description>

      <Flex gap="3" mt="4" justify="end">
        <Button
          variant="soft"
          color="gray"
          onClick={() => {
            setMode(MacroplanDialogMode.View);
          }}
        >
          Cancel
        </Button>
        <Button variant="solid" color={dangerToken} onClick={deleteMacroplan}>
          Delete
        </Button>
      </Flex>
    </Dialog.Content>
  );
}
