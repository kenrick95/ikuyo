import {
  deleteMutation,
  patchMutation,
  postMutation,
  putMutation,
} from '../data/apiClient';
import { id } from '../data/id';
import {
  optimisticRun,
  optimisticTaskListPatch,
  optimisticTaskListRemove,
  optimisticTaskListUpsert,
  optimisticTaskPatch,
  optimisticTaskRemove,
  optimisticTaskUpsert,
} from '../data/optimistic';
import { useBoundStore } from '../data/store';
import type { TripSliceTask, TripSliceTaskList } from '../Trip/store/types';

export type DbTask = {
  id: string;
  index: number;
  title: string;
  description: string;
  status: number;
  createdAt: number;
  lastUpdatedAt: number;
  dueAt?: number | null | undefined;
  completedAt?: number | null | undefined;
};
export type DbTaskList = {
  id: string;
  title: string;
  createdAt: number;
  lastUpdatedAt: number;
  index: number;
  status: number;
  task: DbTask[] | undefined;
};

export async function dbAddTaskList(
  newTaskList: Omit<DbTaskList, 'id' | 'createdAt' | 'lastUpdatedAt' | 'task'>,
  { tripId }: { tripId: string },
) {
  const newId = id();
  return optimisticRun(
    ['taskList', 'trip'],
    () => {
      optimisticTaskListUpsert(tripId, {
        ...newTaskList,
        id: newId,
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        tripId,
        taskIds: [],
      } as TripSliceTaskList);
    },
    async () => {
      const result = await postMutation<{ id: string }>(
        `/api/trips/${encodeURIComponent(tripId)}/task-lists`,
        { ...newTaskList, id: newId },
      );
      return { id: result.id, result };
    },
  );
}

export async function dbUpdateTaskList(
  taskList: Omit<DbTaskList, 'createdAt' | 'lastUpdatedAt'>,
) {
  return optimisticRun(
    ['taskList'],
    () => optimisticTaskListPatch(taskList.id, taskList),
    () =>
      putMutation(
        `/api/task-lists/${encodeURIComponent(taskList.id)}`,
        taskList,
      ),
  );
}

export async function dbDeleteTaskList(taskListId: string) {
  const state = useBoundStore.getState();
  const tripId = state.taskList[taskListId]?.tripId;
  return optimisticRun(
    ['taskList', 'task', 'trip'],
    () => {
      if (tripId) {
        const deleted = state.taskList[taskListId];
        const taskIds = deleted?.taskIds ?? [];
        optimisticTaskListRemove(tripId, taskListId);
        for (const taskId of taskIds) optimisticTaskRemove(taskListId, taskId);
      }
    },
    () => deleteMutation(`/api/task-lists/${encodeURIComponent(taskListId)}`),
  );
}

export async function dbAddTask(
  newTask: Omit<DbTask, 'id' | 'createdAt' | 'lastUpdatedAt'>,
  { taskListId }: { taskListId: string },
) {
  const newId = id();
  const taskList = useBoundStore.getState().taskList[taskListId];
  return optimisticRun(
    ['task', 'taskList'],
    () => {
      if (taskList) {
        optimisticTaskUpsert(taskListId, {
          ...newTask,
          id: newId,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          taskListId,
          tripId: taskList.tripId,
          commentGroupId: undefined,
        } as TripSliceTask);
      }
    },
    async () => {
      const result = await postMutation<{ id: string }>(
        `/api/task-lists/${encodeURIComponent(taskListId)}/tasks`,
        { ...newTask, id: newId },
      );
      return { id: result.id, result };
    },
  );
}

export async function dbUpdateTask(
  task: Omit<DbTask, 'createdAt' | 'lastUpdatedAt'>,
) {
  return optimisticRun(
    ['task'],
    () => optimisticTaskPatch(task.id, task),
    () => putMutation(`/api/tasks/${encodeURIComponent(task.id)}`, task),
  );
}

export async function dbDeleteTask(taskId: string, taskListId: string) {
  return optimisticRun(
    ['task', 'taskList'],
    () => optimisticTaskRemove(taskListId, taskId),
    () => deleteMutation(`/api/tasks/${encodeURIComponent(taskId)}`),
  );
}

export async function dbUpdateTaskIndexes(
  tasks: Array<{ id: string; index: number }>,
  tripId?: string,
) {
  if (!tripId) {
    throw new Error('tripId is required to reorder tasks against the backend');
  }
  return optimisticRun(
    ['task'],
    () => {
      for (const task of tasks) {
        optimisticTaskPatch(task.id, { index: task.index });
      }
    },
    () =>
      patchMutation(`/api/trips/${encodeURIComponent(tripId)}/tasks/reorder`, {
        tasks,
      }),
  );
}

export async function dbMoveTaskToTaskList(
  taskId: string,
  currentTaskListId: string,
  newTaskListId: string,
  newIndex: number,
) {
  const state = useBoundStore.getState();
  const task = state.task[taskId];
  return optimisticRun(
    ['task', 'taskList'],
    () => {
      if (task) {
        optimisticTaskRemove(currentTaskListId, taskId);
        optimisticTaskUpsert(newTaskListId, {
          ...task,
          taskListId: newTaskListId,
          index: newIndex,
        });
      }
    },
    () =>
      postMutation(`/api/tasks/${encodeURIComponent(taskId)}/move`, {
        toTaskListId: newTaskListId,
        newIndex,
      }),
  );
}

export async function dbUpdateTaskListIndexes(
  taskLists: Array<{ id: string; index: number }>,
  tripId?: string,
) {
  if (!tripId) {
    throw new Error(
      'tripId is required to reorder task lists against the backend',
    );
  }
  return optimisticRun(
    ['taskList'],
    () => {
      for (const taskList of taskLists) {
        optimisticTaskListPatch(taskList.id, { index: taskList.index });
      }
    },
    () =>
      patchMutation(
        `/api/trips/${encodeURIComponent(tripId)}/task-lists/reorder`,
        { taskLists },
      ),
  );
}
