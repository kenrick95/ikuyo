import { Box, Dialog } from '@radix-ui/themes';
import { CommonLargeDialogMaxWidth } from '../Dialog/ui';
import { useBoundStore } from '../data/store';
import { TaskStatus } from '../Task/TaskStatus';
import type { TripSliceTrip } from './store/types';
import { TaskForm } from './TripTask/TaskForm/TaskForm';
import { TaskFormMode } from './TripTask/TaskForm/TaskFormMode';

export function TaskNewDialog({
  trip,
  taskListId,
}: {
  trip: TripSliceTrip;
  taskListId: string;
}) {
  const popDialog = useBoundStore((state) => state.popDialog);

  return (
    <Dialog.Root open>
      <Dialog.Content maxWidth={CommonLargeDialogMaxWidth}>
        <Dialog.Title>New Task</Dialog.Title>
        <Dialog.Description size="2">
          Add a new task to organize your trip activities...
        </Dialog.Description>
        <Box height="16px" />
        <TaskForm
          mode={TaskFormMode.New}
          taskListId={taskListId}
          tripTimeZone={trip.timeZone}
          taskTitle=""
          taskDescription=""
          taskStatus={TaskStatus.Todo}
          taskDueAtDateTime={undefined}
          taskIndex={undefined}
          onFormCancel={popDialog}
          onFormSuccess={popDialog}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
