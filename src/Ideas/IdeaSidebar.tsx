import { CalendarIcon, ClockIcon } from '@radix-ui/react-icons';
import { Badge, Box, Card, ScrollArea, Text } from '@radix-ui/themes';
import clsx from 'clsx';
import { memo, useMemo } from 'react';
import { ActivityIdea } from '../Activity/ActivityIdea';
import type { TripSliceActivity } from '../Trip/store/types';
import { TripViewMode } from '../Trip/TripViewMode';
import s from './IdeaSidebar.module.css';

interface IdeaSidebarProps {
  activities: TripSliceActivity[];
  userCanEditOrDelete: boolean;
  isVisible: boolean;
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
          Activity Idea List
        </Text>
        <Badge variant="soft" color="gray" size="1">
          {ideaActivities.length}
        </Badge>
      </Box>

      <ScrollArea className={s.content}>
        <Box className={s.activityList}>
          {ideaActivities.map((activity) => (
            <ActivityIdea
              key={activity.id}
              activity={activity}
              userCanEditOrDelete={userCanEditOrDelete}
              tripViewMode={TripViewMode.Timetable}
              className={s.activityItem}
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
