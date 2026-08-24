import { id } from '@instantdb/core';
import {
  deleteMutation,
  patchMutation,
  postMutation,
  putMutation,
} from '../data/apiClient';
import { backendTaskWrites } from '../data/backendConfig';
import { db } from '../data/db';
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
  if (backendTaskWrites) {
    const newId = id();
    return optimisticRun(
      ['taskList', 'trip'],
      () => {
        const trip = useBoundStore.getState().trip[tripId];
        optimisticTaskListUpsert(tripId, {
          ...newTaskList,
          id: newId,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
          tripId,
          taskIds: [],
        } as TripSliceTaskList);
        void trip;
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
  const newId = id();
  return {
    id: newId,
    result: await db.transact([
      db.tx.taskList[newId]
        .update({
          ...newTaskList,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          trip: tripId,
        }),
    ]),
  };
}
export async function dbUpdateTaskList(
  taskList: Omit<DbTaskList, 'createdAt' | 'lastUpdatedAt'>,
) {
  if (backendTaskWrites) {
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
  return db.transact(
    db.tx.taskList[taskList.id].merge({
      ...taskList,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbDeleteTaskList(taskListId: string) {
  if (backendTaskWrites) {
    const state = useBoundStore.getState();
    const tripId = state.taskList[taskListId]?.tripId;
    return optimisticRun(
      ['taskList', 'task', 'trip'],
      () => {
        if (tripId) {
          const deleted = state.taskList[taskListId];
          const taskIds = deleted?.taskIds ?? [];
          optimisticTaskListRemove(tripId, taskListId);
          for (const taskId of taskIds)
            optimisticTaskRemove(taskListId, taskId);
        }
      },
      () => deleteMutation(`/api/task-lists/${encodeURIComponent(taskListId)}`),
    );
  }
  const tasks = await db.queryOnce({
    task: {
      $: {
        fields: ['id'],
        where: {
          'taskList.id': taskListId,
        },
      },
    },
  });
  // Delete all the comments associated with the tasks
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'task',
          'object.task.id': { $in: tasks.data.task.map((task) => task.id) },
        },
        fields: ['id'],
      },
    },
  });
  const commentGroupIds = commentGroups.data.commentGroup.map(
    (commentGroup) => commentGroup.id,
  );
  const commentIds = commentGroups.data.commentGroup.flatMap((commentGroup) =>
    commentGroup.comment.map((comment) => comment.id),
  );

  const transactions = [
    ...commentGroupIds.map((commentGroupId) =>
      db.tx.commentGroup[commentGroupId].delete(),
    ),
    ...commentGroupIds.map((commentGroupId) =>
      // CommentGroupObject has same id as commentGroup
      db.tx.commentGroupObject[commentGroupId].delete(),
    ),
    ...commentIds.map((commentId) => db.tx.comment[commentId].delete()),
    ...tasks.data.task.map((task: { id: string }) =>
      db.tx.task[task.id].delete(),
    ),
    db.tx.taskList[taskListId].delete(),
  ];
  return db.transact(transactions);
}
export async function dbAddTask(
  newTask: Omit<DbTask, 'id' | 'createdAt' | 'lastUpdatedAt'>,
  { taskListId }: { taskListId: string },
) {
  if (backendTaskWrites) {
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
  const newId = id();
  return {
    id: newId,
    result: await db.transact([
      db.tx.task[newId]
        .create({
          ...newTask,
          createdAt: Date.now(),
          lastUpdatedAt: Date.now(),
        })
        .link({
          taskList: taskListId,
        }),
    ]),
  };
}
export async function dbUpdateTask(
  task: Omit<DbTask, 'createdAt' | 'lastUpdatedAt'>,
) {
  if (backendTaskWrites) {
    return optimisticRun(
      ['task'],
      () => optimisticTaskPatch(task.id, task),
      () => putMutation(`/api/tasks/${encodeURIComponent(task.id)}`, task),
    );
  }
  return db.transact(
    db.tx.task[task.id].merge({
      ...task,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbDeleteTask(taskId: string, taskListId: string) {
  if (backendTaskWrites) {
    return optimisticRun(
      ['task', 'taskList'],
      () => optimisticTaskRemove(taskListId, taskId),
      () => deleteMutation(`/api/tasks/${encodeURIComponent(taskId)}`),
    );
  }
  const commentGroups = await db.queryOnce({
    commentGroup: {
      comment: { $: { fields: ['id'] } },
      $: {
        where: {
          'object.type': 'task',
          'object.task.id': taskId,
        },
        fields: ['id'],
      },
    },
  });
  const commentGroupIds = commentGroups.data.commentGroup.map(
    (commentGroup) => commentGroup.id,
  );
  const commentIds = commentGroups.data.commentGroup.flatMap((commentGroup) =>
    commentGroup.comment.map((comment) => comment.id),
  );
  return db.transact([
    ...commentGroupIds.map((commentGroupId) =>
      db.tx.commentGroup[commentGroupId].delete(),
    ),
    ...commentGroupIds.map((commentGroupId) =>
      // CommentGroupObject has same id as commentGroup
      db.tx.commentGroupObject[commentGroupId].delete(),
    ),
    ...commentIds.map((commentId) => db.tx.comment[commentId].delete()),
    db.tx.taskList[taskListId].unlink({
      task: [taskId],
    }),
    db.tx.task[taskId].delete(),
  ]);
}

export async function dbUpdateTaskIndexes(
  tasks: Array<{ id: string; index: number }>,
  tripId?: string,
) {
  if (backendTaskWrites && tripId) {
    return optimisticRun(
      ['task'],
      () => {
        for (const task of tasks) {
          optimisticTaskPatch(task.id, { index: task.index });
        }
      },
      () =>
        patchMutation(
          `/api/trips/${encodeURIComponent(tripId)}/tasks/reorder`,
          {
            tasks,
          },
        ),
    );
  }
  const transactions = tasks.map((task) =>
    db.tx.task[task.id].merge({
      index: task.index,
      lastUpdatedAt: Date.now(),
    }),
  );
  return db.transact(transactions);
}

export async function dbMoveTaskToTaskList(
  taskId: string,
  currentTaskListId: string,
  newTaskListId: string,
  newIndex: number,
) {
  if (backendTaskWrites) {
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
  return db.transact([
    db.tx.taskList[currentTaskListId].unlink({ task: taskId }),
    db.tx.task[taskId]
      .merge({
        index: newIndex,
        lastUpdatedAt: Date.now(),
      })
      .link({
        taskList: newTaskListId,
      }),
  ]);
}

export async function dbUpdateTaskListIndexes(
  taskLists: Array<{ id: string; index: number }>,
  tripId?: string,
) {
  if (backendTaskWrites && tripId) {
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
  const transactions = taskLists.map((taskList) =>
    db.tx.taskList[taskList.id].merge({
      index: taskList.index,
      lastUpdatedAt: Date.now(),
    }),
  );
  return db.transact(transactions);
}
