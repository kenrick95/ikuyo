import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useMemo } from 'react';
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
}: {
  className?: string;
  macroplan: TripSliceMacroplan;
  gridColumnStart?: string;
  gridColumnEnd?: string;
  tripViewMode: TripViewModeType;
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
          <ContextMenu.Item onClick={openMacroplanEditDialog}>
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color={dangerToken}
            onClick={openMacroplanDeleteDialog}
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
    prevProps.gridColumnEnd === nextProps.gridColumnEnd
  );
});
