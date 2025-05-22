import { ClockIcon, HomeIcon } from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useMemo } from 'react';
import type { TripSliceAccommodation } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import { dangerToken } from '../ui';
import s from './Accommodation.module.css';
import { AccommodationDisplayTimeMode } from './AccommodationDisplayTimeMode';
import { useAccommodationDialogHooks } from './accommodationDialogHooks';
import { formatTime } from './time';

function AccommodationInner({
  className,
  accommodation,
  tripViewMode,
  displayTimeMode,
  gridColumnStart,
  gridColumnEnd,
  timeZone,
}: {
  className?: string;
  accommodation: TripSliceAccommodation;
  tripViewMode: TripViewModeType;
  displayTimeMode?: AccommodationDisplayTimeMode;
  gridColumnStart?: string;
  gridColumnEnd?: string;
  timeZone: string;
}) {
  const responsiveTextSize = { initial: '1' as const };
  const {
    openAccommodationDeleteDialog,
    openAccommodationEditDialog,
    openAccommodationViewDialog,
  } = useAccommodationDialogHooks(tripViewMode, accommodation.id);
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
            className={clsx(s.accommodation, className)}
            style={style}
            onClick={openAccommodationViewDialog}
          >
            <Text as="div" size={responsiveTextSize} weight="bold">
              <HomeIcon style={{ verticalAlign: '-3px' }} />{' '}
              {accommodation.name}
            </Text>
            {tripViewMode === TripViewMode.List &&
            (displayTimeMode === AccommodationDisplayTimeMode.CheckIn ||
              displayTimeMode === AccommodationDisplayTimeMode.CheckOut) ? (
              <Text as="div" size={responsiveTextSize} color="gray">
                <ClockIcon style={{ verticalAlign: '-2px' }} />{' '}
                {displayTimeMode}:{' '}
                {formatTime(
                  displayTimeMode === AccommodationDisplayTimeMode.CheckIn
                    ? accommodation.timestampCheckIn
                    : accommodation.timestampCheckOut,
                  timeZone,
                )}
              </Text>
            ) : null}
          </Box>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          <ContextMenu.Label>{accommodation.name}</ContextMenu.Label>
          <ContextMenu.Item onClick={openAccommodationViewDialog}>
            View
          </ContextMenu.Item>
          <ContextMenu.Item onClick={openAccommodationEditDialog}>
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color={dangerToken}
            onClick={openAccommodationDeleteDialog}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
    </>
  );
}
export const Accommodation = memo(
  AccommodationInner,
  (prevProps, nextProps) => {
    return (
      prevProps.accommodation.id === nextProps.accommodation.id &&
      prevProps.accommodation.name === nextProps.accommodation.name &&
      prevProps.tripViewMode === nextProps.tripViewMode &&
      prevProps.displayTimeMode === nextProps.displayTimeMode &&
      prevProps.gridColumnStart === nextProps.gridColumnStart &&
      prevProps.gridColumnEnd === nextProps.gridColumnEnd &&
      prevProps.timeZone === nextProps.timeZone
    );
  },
);
