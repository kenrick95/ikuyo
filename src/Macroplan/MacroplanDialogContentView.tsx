import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback } from 'react';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { useTrip } from '../Trip/hooks';
import type { TripSliceMacroplan } from '../Trip/store';
import s from './Macroplan.module.css';
import { MacroplanDialogMode } from './MacroplanDialogMode';

export function MacroplanDialogContentView({
  data: macroplan,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceMacroplan>) {
  const trip = useTrip(macroplan?.tripId);

  const macroplanDateStartStr =
    macroplan && trip
      ? DateTime.fromMillis(macroplan.timestampStart)
          .setZone(trip.timeZone)
          .toFormat('dd LLLL yyyy')
      : undefined;
  const macroplanDateEndStr =
    macroplan && trip
      ? DateTime.fromMillis(macroplan.timestampEnd)
          .setZone(trip.timeZone)
          .minus({ minute: 1 })
          .toFormat('dd LLLL yyyy')
      : undefined;

  const notes = useParseTextIntoNodes(macroplan?.notes);

  const goToEditMode = useCallback(() => {
    setMode(MacroplanDialogMode.Edit);
  }, [setMode]);
  const goToDeleteMode = useCallback(() => {
    setMode(MacroplanDialogMode.Delete);
  }, [setMode]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="View Day Plan" />
      <Flex gap="3" mb="3" justify="start">
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={goToEditMode}
        >
          Edit
        </Button>
        <Button
          type="button"
          size="2"
          variant="soft"
          color="gray"
          onClick={goToDeleteMode}
        >
          Delete
        </Button>
      </Flex>
      <Dialog.Description size="2">Details of day plan</Dialog.Description>
      <Flex direction="column" gap="3" mt="3">
        <Heading as="h2" size="4">
          Plan
        </Heading>
        <Text>{macroplan?.name ?? <Skeleton>Day plan</Skeleton>}</Text>
        <Heading as="h2" size="4">
          Start
        </Heading>
        <Text>{macroplanDateStartStr}</Text>
        <Heading as="h2" size="4">
          End
        </Heading>
        <Text>{macroplanDateEndStr}</Text>
        {macroplan?.notes ? (
          <>
            <Heading as="h2" size="4">
              Notes
            </Heading>
            <Text className={s.activityDescription}>{notes}</Text>
          </>
        ) : (
          <></>
        )}
      </Flex>
    </Dialog.Content>
  );
}
