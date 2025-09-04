import { id } from '@instantdb/core';
import { db } from '../data/db';
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
  return db.transact(
    db.tx.taskList[taskList.id].merge({
      ...taskList,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbDeleteTaskList(taskListId: string) {
  const tasks = await db.queryOnce({
    task: {
      $: { fields: ['id'] },
      taskList: { $eq: taskListId },
    },
  });
  const transactions = [
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
  return db.transact(
    db.tx.task[task.id].merge({
      ...task,
      lastUpdatedAt: Date.now(),
    }),
  );
}
export async function dbDeleteTask(taskId: string, taskListId: string) {
  return db.transact([
    db.tx.taskList[taskListId].unlink({
      task: [taskId],
    }),
    db.tx.task[taskId].delete(),
  ]);
}

export async function dbUpdateTaskIndexes(
  tasks: Array<{ id: string; index: number }>,
) {
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
  console.log('dbMoveTaskToTaskList', {
    taskId,
    currentTaskListId,
    newTaskListId,
    newIndex,
  });

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
