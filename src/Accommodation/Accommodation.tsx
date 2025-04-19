import { TripViewMode } from '../Trip/TripViewMode';
import { DbAccommodationWithTrip } from './db';
import clsx from 'clsx';
import { Text, Box, ContextMenu } from '@radix-ui/themes';
import s from './Accommodation.module.css';
import { useState } from 'react';
import { AccommodationViewDialog } from './AccommodationViewDialog';
import { AccommodationEditDialog } from './AccommodationEditDialog';
import { AccommodationDeleteDialog } from './AccommodationDeleteDialog';
import { ClockIcon, HomeIcon } from '@radix-ui/react-icons';
import { formatTime } from './time';
import { AccommodationDisplayTimeMode } from './AccommodationDisplayTimeMode';
import { dangerToken } from '../ui';

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

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Box
            p={{ initial: '1' }}
            as="div"
            role="button"
            tabIndex={0}
            className={clsx(s.accommodation, className)}
            style={style}
            onClick={() => {
              setViewDialogOpen(true);
            }}
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
          <ContextMenu.Item
            onClick={() => {
              setViewDialogOpen(true);
            }}
          >
            View
          </ContextMenu.Item>
          <ContextMenu.Item
            onClick={() => {
              setEditDialogOpen(true);
            }}
          >
            Edit
          </ContextMenu.Item>
          <ContextMenu.Separator />
          <ContextMenu.Item
            color={dangerToken}
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
      {viewDialogOpen ? (
        <AccommodationViewDialog
          accommodation={accommodation}
          dialogOpen={viewDialogOpen}
          setDialogOpen={setViewDialogOpen}
          setEditDialogOpen={setEditDialogOpen}
          setDeleteDialogOpen={setDeleteDialogOpen}
        />
      ) : null}
      {editDialogOpen ? (
        <AccommodationEditDialog
          accommodation={accommodation}
          dialogOpen={editDialogOpen}
          setDialogOpen={setEditDialogOpen}
        />
      ) : null}
      {deleteDialogOpen ? (
        <AccommodationDeleteDialog
          accommodation={accommodation}
          dialogOpen={deleteDialogOpen}
          setDialogOpen={setDeleteDialogOpen}
        />
      ) : null}
    </>
  );
}
