import { ClockIcon, HomeIcon } from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback } from 'react';
import { TripViewMode } from '../Trip/TripViewMode';
import { dangerToken } from '../ui';
import s from './Accommodation.module.css';
import { AccommodationDisplayTimeMode } from './AccommodationDisplayTimeMode';
import type { DbAccommodationWithTrip } from './db';
import { formatTime } from './time';

import type * as React from 'react';
import { useLocation } from 'wouter';
import { ROUTES_TRIP_DIALOGS } from '../Routes/routes';
export function Accommodation({
  className,
  accommodation,
  tripViewMode,
  displayTimeMode,
  style,
}: {
  className?: string;
  accommodation: DbAccommodationWithTrip;
  tripViewMode: TripViewMode;
  displayTimeMode?: AccommodationDisplayTimeMode;
  style?: React.CSSProperties;
}) {
  const responsiveTextSize = { initial: '1' as const };
  const [, setLocation] = useLocation();
  const openAccommodationViewDialog = useCallback(() => {
    setLocation(ROUTES_TRIP_DIALOGS.Accommodation.asRoute(accommodation.id));
  }, [accommodation, setLocation]);
  const openAccommodationEditDialog = useCallback(() => {
    setLocation(
      ROUTES_TRIP_DIALOGS.AccommodationEdit.asRoute(accommodation.id),
    );
  }, [accommodation, setLocation]);
  const openAccommodationDeleteDialog = useCallback(() => {
    setLocation(
      ROUTES_TRIP_DIALOGS.AccommodationDelete.asRoute(accommodation.id),
    );
  }, [accommodation, setLocation]);

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
              <>
                <Text as="div" size={responsiveTextSize} color="gray">
                  <ClockIcon style={{ verticalAlign: '-2px' }} />{' '}
                  {displayTimeMode}:{' '}
                  {formatTime(
                    displayTimeMode === AccommodationDisplayTimeMode.CheckIn
                      ? accommodation.timestampCheckIn
                      : accommodation.timestampCheckOut,
                    accommodation.trip.timeZone,
                  )}
                </Text>
              </>
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
