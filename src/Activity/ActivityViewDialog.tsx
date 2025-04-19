import { Button, Dialog, Flex, Heading, Text } from '@radix-ui/themes';
import { DateTime } from 'luxon';

import createUrlRegExp from 'url-regex-safe';

import { useMemo } from 'react';
import { CommonDialogMaxWidth } from '../dialog';
import s from './Activity.module.css';
import type { DbActivityWithTrip } from './db';
export function ActivityViewDialog({
  activity,
  dialogOpen,
  setDialogOpen,
  setEditDialogOpen,
  setDeleteDialogOpen,
}: {
  activity: DbActivityWithTrip;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
  setEditDialogOpen: (newValue: boolean) => void;
  setDeleteDialogOpen: (newValue: boolean) => void;
}) {
  const activityStartStr = DateTime.fromMillis(activity.timestampStart)
    .setZone(activity.trip.timeZone)
    .toFormat('dd LLLL yyyy HH:mm');
  const activityEndStr = DateTime.fromMillis(activity.timestampEnd)
    .setZone(activity.trip.timeZone)
    // since 1 activity must be in same day, so might as well just show the time for end
    .toFormat('HH:mm');

  const descriptions = useMemo(() => {
    const urlRegex = createUrlRegExp({
      localhost: false,
      ipv4: false,
      ipv6: false,
    });

    const activityDescription = activity.description || '';
    const matchArray = activityDescription.matchAll(urlRegex);

    const parts: Array<React.ReactNode> = [];
    let i = 0;
    for (const match of matchArray) {
      const url = match[0];
      if (url) {
        const partBeforeUrl = activityDescription.slice(i, match.index);
        parts.push(partBeforeUrl);
        if (!url.startsWith('http')) {
          parts.push(url);
        } else {
          parts.push(
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </a>,
          );
        }
        i = match.index + url.length;
      }
    }
    parts.push(activityDescription.slice(i, activityDescription.length));
    return parts;
  }, [activity.description]);
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth={CommonDialogMaxWidth}>
        <Dialog.Title>View Activity</Dialog.Title>
        <Dialog.Description>Activity details</Dialog.Description>
        <Flex direction="column" gap="3" mt="3">
          <Heading as="h2" size="4">
            Title
          </Heading>
          <Text>{activity.title}</Text>
          <Heading as="h2" size="4">
            Time
          </Heading>
          <Text>
            {activityStartStr} to {activityEndStr}
          </Text>

          {activity.location ? (
            <>
              <Heading as="h2" size="4">
                Location
              </Heading>
              <Text>{activity.location}</Text>
            </>
          ) : (
            <></>
          )}
          {activity.description ? (
            <>
              <Heading as="h2" size="4">
                Description
              </Heading>
              <Text className={s.activityDescription}>{descriptions}</Text>
            </>
          ) : (
            <></>
          )}
        </Flex>
        <Flex gap="3" mt="5" justify="end">
          <Button
            mr="auto"
            type="button"
            size="2"
            variant="soft"
            color="gray"
            onClick={() => {
              setDialogOpen(false);
              setDeleteDialogOpen(true);
            }}
          >
            Delete
          </Button>
          <Button
            type="button"
            size="2"
            variant="soft"
            color="gray"
            onClick={() => {
              setDialogOpen(false);
              setEditDialogOpen(true);
            }}
          >
            Edit
          </Button>
          <Dialog.Close>
            <Button type="button" size="2">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
