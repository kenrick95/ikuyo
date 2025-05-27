import {
  Button,
  Dialog,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';
import { CommentGroupWithForm } from '../Comment/CommentGroupWithForm';
import { COMMENT_GROUP_OBJECT_TYPE } from '../Comment/db';
import { useParseTextIntoNodes } from '../common/text/parseTextIntoNodes';
import type { DialogContentProps } from '../Dialog/DialogRoute';
import { useDeepBoundStore } from '../data/store';
import { TripUserRole } from '../data/TripUserRole';
import { useTrip } from '../Trip/store/hooks';
import type { TripSliceMacroplan } from '../Trip/store/types';
import s from './Macroplan.module.css';
import { MacroplanDialogMode } from './MacroplanDialogMode';

export function MacroplanDialogContentView({
  data: macroplan,
  setMode,
  dialogContentProps,
  setDialogClosable,
  DialogTitleSection,
}: DialogContentProps<TripSliceMacroplan>) {
  const { trip } = useTrip(macroplan?.tripId);
  const userCanEditOrDelete = useMemo(() => {
    return (
      trip?.currentUserRole === TripUserRole.Owner ||
      trip?.currentUserRole === TripUserRole.Editor
    );
  }, [trip?.currentUserRole]);

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
  const currentUser = useDeepBoundStore((state) => state.currentUser);

  const goToEditMode = useCallback(() => {
    setMode(MacroplanDialogMode.Edit);
  }, [setMode]);
  const goToDeleteMode = useCallback(() => {
    setMode(MacroplanDialogMode.Delete);
  }, [setMode]);
  const setDialogUnclosable = useCallback(() => {
    setDialogClosable(false);
  }, [setDialogClosable]);
  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection
        title={
          <>Day Plan: {macroplan?.name ?? <Skeleton>Day plan</Skeleton>}</>
        }
      />
      <Flex
        gap="5"
        justify="between"
        direction={{ initial: 'column', md: 'row' }}
      >
        <Flex
          direction="column"
          gap="3"
          flexGrow="1"
          maxWidth={{ initial: '100%', md: '50%' }}
        >
          <Flex gap="3" mb="3" justify="start">
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              onClick={userCanEditOrDelete ? goToEditMode : undefined}
              disabled={!userCanEditOrDelete}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="2"
              variant="soft"
              color="gray"
              onClick={userCanEditOrDelete ? goToDeleteMode : undefined}
              disabled={!userCanEditOrDelete}
            >
              Delete
            </Button>
          </Flex>
          <Dialog.Description size="2">Details of day plan</Dialog.Description>
          <Heading as="h2" size="4">
            Plan
          </Heading>
          <Text>{macroplan?.name ?? <Skeleton>Day plan</Skeleton>}</Text>
          <Heading as="h2" size="4">
            Date
          </Heading>
          <Text>
            {macroplanDateStartStr ?? <Skeleton>1 January 2025</Skeleton>}
            &ndash;
            {macroplanDateEndStr ?? <Skeleton>15 January 2025</Skeleton>}
          </Text>
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
        <Flex
          direction="column"
          gap="3"
          flexGrow="1"
          maxWidth={{ initial: '100%', md: '50%' }}
        >
          <Heading as="h2" size="4">
            Comments
          </Heading>
          <CommentGroupWithForm
            tripId={macroplan?.tripId}
            objectId={macroplan?.id}
            objectType={COMMENT_GROUP_OBJECT_TYPE.MACROPLAN}
            user={currentUser}
            onFormFocus={setDialogUnclosable}
            commentGroupId={macroplan?.commentGroupId}
          />
        </Flex>
      </Flex>
    </Dialog.Content>
  );
}
