import {
  CalendarIcon,
  ClockIcon,
  InfoCircledIcon,
  SewingPinIcon,
} from '@radix-ui/react-icons';
import {
  Badge,
  Box,
  Card,
  ContextMenu,
  Flex,
  ScrollArea,
  Text,
} from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useCallback, useMemo, useState } from 'react';
import { useActivityDialogHooks } from '../Activity/activityDialogHooks';
import type { TripSliceActivity } from '../Trip/store/types';
import { TripViewMode } from '../Trip/TripViewMode';
import s from './IdeaSidebar.module.css';

interface IdeaSidebarProps {
  activities: TripSliceActivity[];
  userCanEditOrDelete: boolean;
  isVisible: boolean;
}

interface IdeaActivityCardProps {
  activity: TripSliceActivity;
  userCanEditOrDelete: boolean;
}

function IdeaActivityCard({
  activity,
  userCanEditOrDelete,
}: IdeaActivityCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const {
    openActivityViewDialog,
    openActivityDeleteDialog,
    openActivityEditDialog,
  } = useActivityDialogHooks(TripViewMode.Timetable, activity.id);
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
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
    [activity.id],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

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
        <Card
          className={clsx(s.activityCard, isDragging && s.draggingCard)}
          draggable={userCanEditOrDelete}
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
        </Card>
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

function IdeaSidebarInner({
  activities,
  userCanEditOrDelete,
  isVisible,
}: IdeaSidebarProps) {
  const ideaActivities = useMemo(() => {
    return activities.filter(
      (activity) =>
        !activity.timestampStart ||
        !activity.timestampEnd ||
        activity.timestampStart === null ||
        activity.timestampEnd === null,
    );
  }, [activities]);

  if (!isVisible || ideaActivities.length === 0) {
    return null;
  }

  return (
    <Card className={clsx(s.sidebar, s.floating)}>
      <Box className={s.header}>
        <Text size="2" weight="medium" className={s.title}>
          <ClockIcon className={s.titleIcon} />
          Activities Idea List
        </Text>
        <Badge variant="soft" color="amber" size="1">
          {ideaActivities.length}
        </Badge>
      </Box>

      <ScrollArea className={s.content}>
        <Box className={s.activityList}>
          {ideaActivities.map((activity) => (
            <IdeaActivityCard
              key={activity.id}
              activity={activity}
              userCanEditOrDelete={userCanEditOrDelete}
            />
          ))}
        </Box>

        {ideaActivities.length > 0 && (
          <Box className={s.footer}>
            <Text size="1" color="gray">
              <CalendarIcon className={s.footerIcon} /> These are activities
              that do not have a specific time assigned yet.
              {userCanEditOrDelete
                ? ` You can assign them a time by dragging them to the timetable.`
                : ''}
            </Text>
          </Box>
        )}
      </ScrollArea>
    </Card>
  );
}

export const IdeaSidebar = memo(IdeaSidebarInner, (prevProps, nextProps) => {
  return (
    prevProps.activities === nextProps.activities &&
    prevProps.userCanEditOrDelete === nextProps.userCanEditOrDelete &&
    prevProps.isVisible === nextProps.isVisible
  );
});
