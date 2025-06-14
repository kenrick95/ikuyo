import { InfoCircledIcon, SewingPinIcon } from '@radix-ui/react-icons';
import { Box, ContextMenu, Flex, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { useCallback, useState } from 'react';
import type { TripSliceActivity } from '../Trip/store/types';
import { TripViewMode, type TripViewModeType } from '../Trip/TripViewMode';
import s from './ActivityIdea.module.css';
import { useActivityDialogHooks } from './activityDialogHooks';

interface ActivityIdeaProps {
  activity: TripSliceActivity;
  userCanEditOrDelete: boolean;
  tripViewMode: TripViewModeType;
  className?: string;
}

export function ActivityIdea({
  activity,
  userCanEditOrDelete,
  className,
  tripViewMode,
}: ActivityIdeaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const {
    openActivityViewDialog,
    openActivityDeleteDialog,
    openActivityEditDialog,
  } = useActivityDialogHooks(tripViewMode, activity.id);
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (tripViewMode !== TripViewMode.Timetable) {
        // Prevent dragging if the trip is not in timetable view
        e.preventDefault();
        return;
      }
      setIsDragging(true);
      // Store the activity data for the drop
      e.dataTransfer.setData(
        'text/plain',
        JSON.stringify({
          activityId: activity.id,
          originalTimeStart: null,
          originalTimeEnd: null,
          originalDayStart: null,
        }),
      );

      // Set the drag image/opacity
      e.dataTransfer.effectAllowed = 'move';
      if (e.currentTarget) {
        e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
      }
    },
    [activity.id, tripViewMode],
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (tripViewMode !== TripViewMode.Timetable) {
        // Prevent dragging if the trip is not in timetable view
        e.preventDefault();
        return;
      }
      setIsDragging(false);
    },
    [tripViewMode],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openActivityViewDialog();
      }
    },
    [openActivityViewDialog],
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Box
          p={{ initial: '1' }}
          as="div"
          // biome-ignore lint/a11y/useSemanticElements: <Box> need to be a <div>
          role="button"
          className={clsx(
            s.activityCard,
            className,
            isDragging && s.draggingCard,
          )}
          draggable={
            tripViewMode === TripViewMode.Timetable && userCanEditOrDelete
          }
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onClick={openActivityViewDialog}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          aria-label={`Activity: ${activity.title}${activity.location ? `, at ${activity.location}` : ''}`}
        >
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium" className={s.activityTitle}>
              {activity.title}
            </Text>
            {activity.location && (
              <Flex align="center" gap="1">
                <SewingPinIcon className={s.locationIcon} />
                <Text size="1" color="gray" className={s.activityLocation}>
                  {activity.location}
                </Text>
              </Flex>
            )}
            {activity.description && (
              <Flex align="center" gap="1">
                <InfoCircledIcon className={s.descriptionIcon} />
                <Text size="1" color="gray" className={s.activityDescription}>
                  {activity.description}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onClick={openActivityViewDialog}>
          View
        </ContextMenu.Item>
        {userCanEditOrDelete && (
          <>
            <ContextMenu.Item onClick={openActivityEditDialog}>
              Edit
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item onClick={openActivityDeleteDialog} color="red">
              Delete
            </ContextMenu.Item>
          </>
        )}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
