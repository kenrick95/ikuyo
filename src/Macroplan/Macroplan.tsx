import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { dangerToken } from '../common/ui';
import type { TripSliceMacroplan } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import s from './Macroplan.module.css';
import { useMacroplanDialogHooks } from './MacroplanDialog/macroplanDialogHooks';

const responsiveTextSize = { initial: '1' as const };

function MacroplanInner({
  className,
  macroplan,
  gridColumnStart,
  gridColumnEnd,
  tripViewMode,
  userCanEditOrDelete,
  index,
}: {
  className?: string;
  macroplan: TripSliceMacroplan;
  gridColumnStart?: string;
  gridColumnEnd?: string;
  tripViewMode: TripViewModeType;
  userCanEditOrDelete: boolean;
  index: number;
}) {
  const macroplanRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const {
    openMacroplanDeleteDialog,
    openMacroplanEditDialog,
    openMacroplanViewDialog,
  } = useMacroplanDialogHooks(tripViewMode, macroplan.id);

  // Track if we should restore focus after dialog closes
  const shouldRestoreFocus = useRef(false);

  // Detect when dialog closes and restore focus
  useEffect(() => {
    // If we were in a dialog state and now we're not, restore focus
    if (shouldRestoreFocus.current && location === '/') {
      macroplanRef.current?.focus();
      shouldRestoreFocus.current = false;
    }
  }, [location]);
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
          shouldRestoreFocus.current = true;
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
        shouldRestoreFocus.current = true;
        openMacroplanViewDialog();
      }
    },
    [openMacroplanViewDialog],
  );

  const handleClick = useCallback(() => {
    shouldRestoreFocus.current = true;
    openMacroplanViewDialog();
  }, [openMacroplanViewDialog]);

  const handleContextMenuView = useCallback(() => {
    shouldRestoreFocus.current = true;
    openMacroplanViewDialog();
  }, [openMacroplanViewDialog]);

  const handleContextMenuEdit = useCallback(() => {
    shouldRestoreFocus.current = true;
    openMacroplanEditDialog();
  }, [openMacroplanEditDialog]);

  const handleContextMenuDelete = useCallback(() => {
    shouldRestoreFocus.current = true;
    openMacroplanDeleteDialog();
  }, [openMacroplanDeleteDialog]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          p={{ initial: '1' }}
          as="div"
          role="button"
          tabIndex={0}
          ref={macroplanRef}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          className={clsx(s.macroplan, className)}
          style={style}
          onClick={handleClick}
        >
          <Text as="div" size={responsiveTextSize} weight="bold">
            {macroplan.name}
          </Text>
          {tripViewMode === TripViewMode.List &&
          macroplan.notes &&
          index === 0 ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={s.macroplanNotes}
            >
              <InfoCircledIcon style={{ verticalAlign: '-2px' }} />{' '}
              {macroplan.notes}
            </Text>
          ) : null}
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{macroplan.name}</ContextMenu.Label>
        <ContextMenu.Item onClick={handleContextMenuView}>
          View
        </ContextMenu.Item>
        <ContextMenu.Item
          onClick={userCanEditOrDelete ? handleContextMenuEdit : undefined}
          disabled={!userCanEditOrDelete}
        >
          Edit
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          color={dangerToken}
          onClick={userCanEditOrDelete ? handleContextMenuDelete : undefined}
          disabled={!userCanEditOrDelete}
        >
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
export const Macroplan = memo(MacroplanInner, (prevProps, nextProps) => {
  return (
    prevProps.macroplan.id === nextProps.macroplan.id &&
    prevProps.macroplan.name === nextProps.macroplan.name &&
    prevProps.className === nextProps.className &&
    prevProps.gridColumnStart === nextProps.gridColumnStart &&
    prevProps.gridColumnEnd === nextProps.gridColumnEnd &&
    prevProps.userCanEditOrDelete === nextProps.userCanEditOrDelete &&
    prevProps.index === nextProps.index
  );
});
