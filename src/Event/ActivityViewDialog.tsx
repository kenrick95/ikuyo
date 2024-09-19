import { Dialog, Flex, Text, Heading, Button } from '@radix-ui/themes';
import { DateTime } from 'luxon';
import { DbActivity } from '../data/types';

export function ActivityViewDialog({
  activity,
  dialogOpen,
  setDialogOpen,
}: {
  activity: DbActivity;
  dialogOpen: boolean;
  setDialogOpen: (newValue: boolean) => void;
}) {
  const activityStartStr = DateTime.fromMillis(activity.timestampStart)
    .setZone(activity.trip?.timeZone)
    .toFormat('dd LLLL yyyy HH:mm');
  const activityEndStr = DateTime.fromMillis(activity.timestampEnd)
    .setZone(activity.trip?.timeZone)
    .toFormat('dd LLLL yyyy HH:mm');
  return (
    <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
      <Dialog.Content maxWidth="450px">
        <Dialog.Title>View Activity</Dialog.Title>
        <Dialog.Description>Activity details</Dialog.Description>
        <Flex direction="column" gap="2" mt="3">
          <Heading as="h2" size="3">
            Title
          </Heading>
          <Text>{activity.title}</Text>
          <Heading as="h2" size="3">
            Time
          </Heading>
          <Text>
            {activityStartStr} to {activityEndStr}
          </Text>

          {activity.location ? (
            <>
              <Heading as="h2" size="3">
                Location
              </Heading>
              <Text>{activity.location}</Text>
            </>
          ) : (
            <></>
          )}
          {activity.description ? (
            <>
              <Heading as="h2" size="3">
                Description
              </Heading>
              <Text>{activity.description}</Text>
            </>
          ) : (
            <></>
          )}
        </Flex>
        <Dialog.Close>
          <Flex gap="3" mt="5" justify="end">
            <Button type="button" size="2" variant="soft" color="gray">
              Close
            </Button>
          </Flex>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Root>
  );
}
