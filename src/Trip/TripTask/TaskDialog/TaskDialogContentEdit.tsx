import { Box, Dialog, Spinner } from '@radix-ui/themes';
import { useCallback } from 'react';
import type { DialogContentProps } from '../../../Dialog/DialogRoute';
import { useTrip, useTripTaskList } from '../../store/hooks';
import type { TripSliceTask } from '../../store/types';
import { TaskForm } from '../TaskForm/TaskForm';
import { TaskFormMode } from '../TaskForm/TaskFormMode';
import { TaskDialogMode } from './TaskDialogMode';

export function TaskDialogContentEdit({
  data: task,
  setMode,
  dialogContentProps,
  DialogTitleSection,
}: DialogContentProps<TripSliceTask>) {
  const taskList = useTripTaskList(task?.taskListId ?? '');
  const { trip } = useTrip(taskList?.tripId);

  const backToViewMode = useCallback(() => {
    setMode(TaskDialogMode.View);
  }, [setMode]);

  return (
    <Dialog.Content {...dialogContentProps}>
      <DialogTitleSection title="Edit Task" />
      <Dialog.Description size="2">
        Edit your task details...
      </Dialog.Description>
      <Box height="16px" />
      {task && trip ? (
        <TaskForm
          taskId={task.id}
          taskListId={task.taskListId}
          mode={TaskFormMode.Edit}
          tripTimeZone={trip.timeZone}
          taskTitle={task.title}
          taskDescription={task.description}
          taskStatus={task.status}
          taskDueAt={task.dueAt}
          taskIndex={task.index}
          onFormCancel={backToViewMode}
          onFormSuccess={backToViewMode}
        />
      ) : (
        <Spinner />
      )}
    </Dialog.Content>
  );
}
