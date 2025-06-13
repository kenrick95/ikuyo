import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useCallback, useMemo } from 'react';
import type { TripSliceMacroplan } from '../Trip/store/types';
import type { TripViewModeType } from '../Trip/TripViewMode';
import { dangerToken } from '../ui';
import s from './Macroplan.module.css';
import { useMacroplanDialogHooks } from './macroplanDialogHooks';

const responsiveTextSize = { initial: '1' as const };

function MacroplanInner({
  className,
  macroplan,
  gridColumnStart,
  gridColumnEnd,
  tripViewMode,
  userCanEditOrDelete,
}: {
  className?: string;
  macroplan: TripSliceMacroplan;
  gridColumnStart?: string;
  gridColumnEnd?: string;
  tripViewMode: TripViewModeType;
  userCanEditOrDelete: boolean;
}) {
  const {
    openMacroplanDeleteDialog,
    openMacroplanEditDialog,
    openMacroplanViewDialog,
  } = useMacroplanDialogHooks(tripViewMode, macroplan.id);
  const style = useMemo(() => {
    return {
      gridColumnStart: gridColumnStart,
      gridColumnEnd: gridColumnEnd,
    };
  }, [gridColumnStart, gridColumnEnd]);

  // Handle keyboard navigation for accessibility
  // Use onKeyDown for Enter to open the dialog
  // Use onKeyUp for Space to open the dialog
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        // To avoid scrolling for both keys
        e.preventDefault();
        if (e.key === 'Enter') {
          openMacroplanViewDialog();
        }
      }
    },
    [openMacroplanViewDialog],
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        e.preventDefault();
        openMacroplanViewDialog();
      }
    },
    [openMacroplanViewDialog],
  );

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            p={{ initial: '1' }}
            as="div"
            // biome-ignore lint/a11y/useSemanticElements: <Box> need to be a <div>
            role="button"
            tabIndex={0}
            // TODO: when the dialog is closed, the focus should return here?
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            className={clsx(s.macroplan, className)}
            style={style}
            onClick={openMacroplanViewDialog}
          >
            <Text as="div" size={responsiveTextSize} weight="bold">
              {macroplan.name}
            </Text>
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Label>{macroplan.name}</ContextMenu.Label>
          <ContextMenu.Item onClick={openMacroplanViewDialog}>
            View
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={userCanEditOrDelete ? openMacroplanEditDialog : undefined}
            disabled={!userCanEditOrDelete}
          >
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color={dangerToken}
            onClick={
              userCanEditOrDelete ? openMacroplanDeleteDialog : undefined
            }
            disabled={!userCanEditOrDelete}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </>
  );
}
export const Macroplan = memo(MacroplanInner, (prevProps, nextProps) => {
  return (
    prevProps.macroplan.id === nextProps.macroplan.id &&
    prevProps.macroplan.name === nextProps.macroplan.name &&
    prevProps.className === nextProps.className &&
    prevProps.gridColumnStart === nextProps.gridColumnStart &&
    prevProps.gridColumnEnd === nextProps.gridColumnEnd &&
    prevProps.userCanEditOrDelete === nextProps.userCanEditOrDelete
  );
});
