import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useCurrentUser } from '../../Auth/hooks';
import { CommonLargeDialogMaxWidth } from '../../Dialog/ui';
import { useBoundStore } from '../../data/store';
import { RouteTrip } from '../../Routes/routes';
import { dbDuplicateTrip } from '../db';
import type { TripSliceTrip } from '../store/types';

type DuplicateSection = {
  key:
    | 'includeActivities'
    | 'includeMacroplans'
    | 'includeAccommodations'
    | 'includeExpenses'
    | 'includeTasks'
    | 'includeComments';
  label: string;
  count: number;
};

export function TripDuplicateDialog({ trip }: { trip: TripSliceTrip }) {
  const [, setLocation] = useLocation();
  const user = useCurrentUser();
  const publishToast = useBoundStore((state) => state.publishToast);
  const popDialog = useBoundStore((state) => state.popDialog);
  const clearDialogs = useBoundStore((state) => state.clearDialogs);

  const [title, setTitle] = useState(`${trip.title} (copy)`);
  const [includes, setIncludes] = useState({
    includeActivities: true,
    includeMacroplans: true,
    includeAccommodations: true,
    includeExpenses: true,
    includeTasks: true,
    includeComments: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sections: DuplicateSection[] = useMemo(() => {
    return [
      {
        key: 'includeActivities',
        label: 'Activities',
        count: trip.activityIds.length,
      },
      {
        key: 'includeMacroplans',
        label: 'Day plans',
        count: trip.macroplanIds.length,
      },
      {
        key: 'includeAccommodations',
        label: 'Accommodations',
        count: trip.accommodationIds.length,
      },
      {
        key: 'includeExpenses',
        label: 'Expenses',
        count: trip.expenseIds.length,
      },
      { key: 'includeTasks', label: 'Tasks', count: trip.taskListIds.length },
      {
        key: 'includeComments',
        label: 'Comments',
        count: trip.commentGroupIds.length,
      },
    ];
  }, [
    trip.activityIds,
    trip.macroplanIds,
    trip.accommodationIds,
    trip.expenseIds,
    trip.taskListIds,
    trip.commentGroupIds,
  ]);

  const handleDuplicate = useCallback(() => {
    if (!user) return;
    setIsSubmitting(true);
    void dbDuplicateTrip(
      trip.id,
      {
        title: title.trim(),
        includeActivities: includes.includeActivities,
        includeMacroplans: includes.includeMacroplans,
        includeAccommodations: includes.includeAccommodations,
        includeExpenses: includes.includeExpenses,
        includeTasks: includes.includeTasks,
        includeComments: includes.includeComments,
      },
      { userId: user.id },
    )
      .then(({ id }) => {
        publishToast({
          root: {},
          title: { children: `Trip "${title.trim()}" duplicated` },
          close: {},
        });
        clearDialogs();
        setLocation(RouteTrip.asRouteTarget(id));
      })
      .catch((err: unknown) => {
        console.error('Error duplicating trip', err);
        publishToast({
          root: {},
          title: { children: 'Error duplicating trip' },
          close: {},
        });
        setIsSubmitting(false);
      });
  }, [user, trip.id, title, includes, publishToast, clearDialogs, setLocation]);

  const isTitleEmpty = title.trim().length === 0;

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>Duplicate Trip</Dialog.Title>
        <Dialog.Description size="2">
          Create a new trip based on "{trip.title}". Choose what to copy.
        </Dialog.Description>

        <Box my="4">
          <Text size="2" weight="medium">
            Trip title
          </Text>
          <TextField.Root
            id="duplicate-trip-title"
            mt="1"
            placeholder="Trip title..."
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            disabled={isSubmitting}
          />
        </Box>

        <Flex direction="column" gap="3" mb="4">
          <Text size="2" weight="medium">
            Copy
          </Text>
          {sections.map((section) => (
            <Flex key={section.key} gap="2" align="center">
              <Checkbox
                checked={includes[section.key]}
                onCheckedChange={(checked) => {
                  setIncludes((prev) => ({
                    ...prev,
                    [section.key]: checked === true,
                  }));
                }}
                disabled={isSubmitting}
              />
              <Text size="2">
                {section.label} ({section.count})
              </Text>
            </Flex>
          ))}
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Button
            variant="soft"
            color="gray"
            onClick={popDialog}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            onClick={handleDuplicate}
            disabled={isSubmitting || isTitleEmpty}
          >
            Duplicate
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
