import { ClockIcon, HomeIcon } from '@radix-ui/react-icons';
import { Box, ContextMenu, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback } from 'react';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import { dangerToken } from '../ui';
import s from './Accommodation.module.css';
import { AccommodationDisplayTimeMode } from './AccommodationDisplayTimeMode';
import type { DbAccommodationWithTrip } from './db';
import { formatTime } from './time';

import type * as React from 'react';
import { useLocation } from 'wouter';
import {
  RouteTripListViewAccommodation,
  RouteTripTimetableViewAccommodation,
} from '../Routes/routes';
import {
  AccommodationDialogMode,
  type AccommodationDialogModeType,
} from './AccommodationDialogMode';
export function Accommodation({
  className,
  accommodation,
  tripViewMode,
  displayTimeMode,
  style,
}: {
  className?: string;
  accommodation: DbAccommodationWithTrip;
  tripViewMode: TripViewModeType;
  displayTimeMode?: AccommodationDisplayTimeMode;
  style?: React.CSSProperties;
}) {
  const [, setLocation] = useLocation();
  const responsiveTextSize = { initial: '1' as const };
  const openAccommodationDialog = useCallback(
    (mode: AccommodationDialogModeType) => {
      if (tripViewMode === TripViewMode.List) {
        setLocation(
          RouteTripListViewAccommodation.asRouteTarget(accommodation.id),
          { state: { mode: mode ?? AccommodationDialogMode.View } },
        );
      } else if (tripViewMode === TripViewMode.Timetable) {
        setLocation(
          RouteTripTimetableViewAccommodation.asRouteTarget(accommodation.id),
          { state: { mode: mode ?? AccommodationDialogMode.View } },
        );
      }
    },
    [accommodation, setLocation, tripViewMode],
  );
  const openAccommodationViewDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.View);
  }, [openAccommodationDialog]);
  const openAccommodationEditDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.Edit);
  }, [openAccommodationDialog]);
  const openAccommodationDeleteDialog = useCallback(() => {
    openAccommodationDialog(AccommodationDialogMode.Delete);
  }, [openAccommodationDialog]);

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
