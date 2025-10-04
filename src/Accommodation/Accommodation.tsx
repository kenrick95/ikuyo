import {
  ClockIcon,
  EnvelopeClosedIcon,
  HomeIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'wouter';
import { dangerToken } from '../common/ui';
import type { TripSliceAccommodation } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import s from './Accommodation.module.css';
import { useAccommodationDialogHooks } from './AccommodationDialog/accommodationDialogHooks';
import { AccommodationDisplayTimeMode } from './AccommodationDisplayTimeMode';
import { formatTime } from './time';

function AccommodationInner({
  className,
  accommodation,
  tripViewMode,
  displayTimeMode,
  gridColumnStart,
  gridColumnEnd,
  timeZone,
  userCanEditOrDelete,
}: {
  className?: string;
  accommodation: TripSliceAccommodation;
  tripViewMode: TripViewModeType;
  displayTimeMode?: AccommodationDisplayTimeMode;
  gridColumnStart?: string;
  gridColumnEnd?: string;
  timeZone: string;
  userCanEditOrDelete: boolean;
}) {
  const responsiveTextSize = { initial: '1' as const };
  const accommodationRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const {
    openAccommodationDeleteDialog,
    openAccommodationEditDialog,
    openAccommodationViewDialog,
  } = useAccommodationDialogHooks(tripViewMode, accommodation.id);

  // Track if we should restore focus after dialog closes
  const shouldRestoreFocus = useRef(false);

  // Detect when dialog closes and restore focus
  useEffect(() => {
    // If we were in a dialog state and now we're not, restore focus
    if (shouldRestoreFocus.current && location === '/') {
      accommodationRef.current?.focus();
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
          openAccommodationViewDialog();
        }
      }
    },
    [openAccommodationViewDialog],
  );
  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === ' ') {
        e.preventDefault();
        shouldRestoreFocus.current = true;
        openAccommodationViewDialog();
      }
    },
    [openAccommodationViewDialog],
  );

  const handleClick = useCallback(() => {
    shouldRestoreFocus.current = true;
    openAccommodationViewDialog();
  }, [openAccommodationViewDialog]);

  const handleContextMenuView = useCallback(() => {
    shouldRestoreFocus.current = true;
    openAccommodationViewDialog();
  }, [openAccommodationViewDialog]);

  const handleContextMenuEdit = useCallback(() => {
    shouldRestoreFocus.current = true;
    openAccommodationEditDialog();
  }, [openAccommodationEditDialog]);

  const handleContextMenuDelete = useCallback(() => {
    shouldRestoreFocus.current = true;
    openAccommodationDeleteDialog();
  }, [openAccommodationDeleteDialog]);

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        {/** biome-ignore lint/a11y/useSemanticElements: <Box> need to be a <div> */}
        <Box
          p={{ initial: '1' }}
          as="div"
          role="button"
          tabIndex={0}
          ref={accommodationRef}
          className={clsx(s.accommodation, className)}
          style={style}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
        >
          <Text as="div" size={responsiveTextSize} weight="bold">
            <HomeIcon style={{ verticalAlign: '-3px' }} /> {accommodation.name}
          </Text>
          {tripViewMode === TripViewMode.List &&
          (displayTimeMode === AccommodationDisplayTimeMode.CheckIn ||
            displayTimeMode === AccommodationDisplayTimeMode.CheckOut) ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={s.accommodationCheckInCheckOut}
            >
              <ClockIcon style={{ verticalAlign: '-2px' }} /> {displayTimeMode}:{' '}
              {formatTime(
                displayTimeMode === AccommodationDisplayTimeMode.CheckIn
                  ? accommodation.timestampCheckIn
                  : accommodation.timestampCheckOut,
                timeZone,
              )}
            </Text>
          ) : null}
          {tripViewMode === TripViewMode.List &&
          displayTimeMode === AccommodationDisplayTimeMode.CheckIn &&
          accommodation.address ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={s.accommodationAddress}
            >
              <SewingPinIcon style={{ verticalAlign: '-2px' }} />{' '}
              {accommodation.address}
            </Text>
          ) : null}
          {tripViewMode === TripViewMode.List &&
          displayTimeMode === AccommodationDisplayTimeMode.CheckIn &&
          accommodation.phoneNumber ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={s.accommodationPhoneNumber}
            >
              <EnvelopeClosedIcon style={{ verticalAlign: '-2px' }} />{' '}
              {accommodation.phoneNumber}
            </Text>
          ) : null}
          {tripViewMode === TripViewMode.List &&
          displayTimeMode === AccommodationDisplayTimeMode.CheckIn &&
          accommodation.notes ? (
            <Text
              as="div"
              size={responsiveTextSize}
              color="gray"
              className={s.accommodationNotes}
            >
              <InfoCircledIcon style={{ verticalAlign: '-2px' }} />{' '}
              {accommodation.notes}
            </Text>
          ) : null}
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Label>{accommodation.name}</ContextMenu.Label>
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
      prevProps.timeZone === nextProps.timeZone &&
      prevProps.userCanEditOrDelete === nextProps.userCanEditOrDelete
    );
  },
);
