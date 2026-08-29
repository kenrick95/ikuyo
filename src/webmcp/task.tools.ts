import { assertWritable } from '../data/backendConfig';
import { useBoundStore } from '../data/store';
import {
  dbAddTask,
  dbAddTaskList,
  dbUpdateTask,
  dbUpdateTaskList,
} from '../Task/db';
import { TaskStatus } from '../Task/TaskStatus';
import { requireAuthUser, requireLoadedTrip, resolveTripId } from './context';
import { idempotencyKeySchema, runIdempotent } from './idempotency';
import type { WebMCPTool } from './modelContext';
import { asStr, epochOrIso, int, str, toEpochMs } from './schema';

const VALID_STATUS: number[] = [
  TaskStatus.Todo,
  TaskStatus.InProgress,
  TaskStatus.Done,
  TaskStatus.Archived,
  TaskStatus.Cancelled,
];

function taskListProperties() {
  return {
    tripId: str('Trip id. Defaults to the currently open trip.'),
    idempotencyKey: idempotencyKeySchema(),
    title: str('Task list title.'),
  };
}

function taskProperties() {
  return {
    idempotencyKey: idempotencyKeySchema(),
    title: str('Task title.'),
    description: str('Optional description.'),
    status: int(
      'Task status: 0=todo, 1=in-progress, 2=done, 3=archived, 4=cancelled. Default 0.',
    ),
    dueAt: epochOrIso('Optional due time (ISO-8601 or epoch ms).'),
  };
}

function requireBatch(
  value: unknown,
  name: string,
): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50)
    throw new Error(`${name} must contain between 1 and 50 items`);
  return value.map((item, index) => {
    if (!item || typeof item !== 'object')
      throw new Error(`${name}[${index}] must be an object`);
    return item as Record<string, unknown>;
  });
}

function parseTaskList(input: Record<string, unknown>) {
  const tripId = resolveTripId(input.tripId);
  requireLoadedTrip(tripId);
  return {
    tripId,
    data: { title: asStr(input.title, 'title'), index: 0, status: 0 },
  };
}

async function createTaskList(input: Record<string, unknown>) {
  const parsed = parseTaskList(input);
  return runIdempotent(
    'task-list-create',
    parsed.tripId,
    input.idempotencyKey,
    input,
    async () => {
      const result = await dbAddTaskList(parsed.data, {
        tripId: parsed.tripId,
      });
      return { ok: true, id: result.id, taskListId: result.id };
    },
  );
}

function parseTask(input: Record<string, unknown>, index?: number) {
  const taskListId = asStr(input.taskListId, 'taskListId');
  const existingList = useBoundStore.getState().taskList[taskListId];
  if (!existingList) throw new Error(`Task list ${taskListId} is not loaded.`);
  const status =
    input.status === undefined ? TaskStatus.Todo : Number(input.status);
  if (!VALID_STATUS.includes(status)) throw new Error('status is out of range');
  const dueAt = toEpochMs(input.dueAt, 'dueAt');
  return {
    taskListId,
    data: {
      index: index ?? existingList.taskIds.length,
      title: asStr(input.title, 'title'),
      description: (input.description as string | undefined) ?? '',
      status,
      dueAt: dueAt ?? null,
      completedAt: status === TaskStatus.Done ? Date.now() : null,
    },
  };
}

async function createTask(input: Record<string, unknown>, index?: number) {
  const parsed = parseTask(input, index);
  return runIdempotent(
    'task-create',
    parsed.taskListId,
    input.idempotencyKey,
    input,
    async () => {
      const result = await dbAddTask(parsed.data, {
        taskListId: parsed.taskListId,
      });
      return { ok: true, id: result.id, taskId: result.id };
    },
  );
}

async function createTaskBatch(
  taskListId: string,
  tasks: Array<Record<string, unknown>>,
) {
  const list = useBoundStore.getState().taskList[taskListId];
  if (!list) throw new Error(`Task list ${taskListId} is not loaded.`);
  const firstIndex = list.taskIds.length;
  const items = tasks.map((task) => ({ taskListId, ...task }));
  items.forEach((item, index) => {
    parseTask(item, firstIndex + index);
  });
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < items.length; index++) {
    try {
      results.push(await createTask(items[index], firstIndex + index));
    } catch (error) {
      return {
        ok: false,
        atomic: false,
        committedCount: results.length,
        failedIndex: index,
        results,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return { ok: true, atomic: false, committedCount: results.length, results };
}

async function createListBatch(items: Array<Record<string, unknown>>) {
  items.forEach(parseTaskList);
  const results: Array<Record<string, unknown>> = [];
  for (let index = 0; index < items.length; index++) {
    try {
      results.push(await createTaskList(items[index]));
    } catch (error) {
      return {
        ok: false,
        atomic: false,
        committedCount: results.length,
        failedIndex: index,
        results,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  return { ok: true, atomic: false, committedCount: results.length, results };
}

export function createTaskTools(): WebMCPTool[] {
  return [
    {
      name: 'task-list-create',
      description:
        'Creates a task list (column) within a trip. Tasks are created under a task-list id.',
      inputSchema: {
        type: 'object',
        properties: taskListProperties(),
        required: ['title'],
      },
      async execute(input) {
        assertWritable('creating a task list');
        requireAuthUser();
        return createTaskList(input);
      },
    },
    {
      name: 'task-list-create-many',
      description:
        'Creates up to 50 task lists. Every item is validated before the first write. Writes are ordered and non-atomic; per-item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id applied to lists that omit tripId.'),
          taskLists: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Ordered task lists to create.',
            items: {
              type: 'object',
              properties: taskListProperties(),
              required: ['title'],
            },
          },
        },
        required: ['taskLists'],
      },
      async execute(input) {
        assertWritable('creating task lists');
        requireAuthUser();
        return createListBatch(
          requireBatch(input.taskLists, 'taskLists').map((item) => ({
            tripId: input.tripId,
            ...item,
          })),
        );
      },
    },
    {
      name: 'task-list-create-with-tasks',
      description:
        'Creates one task list and up to 50 tasks in it. All input is validated before writing. Writes are ordered and non-atomic; use a list idempotencyKey and per-task idempotency keys to safely retry a partial result.',
      inputSchema: {
        type: 'object',
        properties: {
          ...taskListProperties(),
          tasks: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Tasks to create in the new list.',
            items: {
              type: 'object',
              properties: taskProperties(),
              required: ['title'],
            },
          },
        },
        required: ['title', 'tasks'],
      },
      async execute(input) {
        assertWritable('creating a task list and tasks');
        requireAuthUser();
        const tasks = requireBatch(input.tasks, 'tasks');
        parseTaskList(input);
        tasks.forEach((task) => {
          asStr(task.title, 'title');
          const status =
            task.status === undefined ? TaskStatus.Todo : Number(task.status);
          if (!VALID_STATUS.includes(status))
            throw new Error('status is out of range');
          toEpochMs(task.dueAt, 'dueAt');
        });
        const list = await createTaskList(input);
        const batch = await createTaskBatch(list.taskListId, tasks);
        return { ...batch, taskListId: list.taskListId, taskList: list };
      },
    },
    {
      name: 'task-list-update',
      description: 'Renames a task list.',
      inputSchema: {
        type: 'object',
        properties: {
          taskListId: str('The task list id.'),
          title: str('New task list title.'),
        },
        required: ['taskListId', 'title'],
      },
      async execute(input) {
        assertWritable('updating a task list');
        requireAuthUser();
        const id = asStr(input.taskListId, 'taskListId');
        const existing = useBoundStore.getState().taskList[id];
        if (!existing) throw new Error(`Task list ${id} is not loaded.`);
        await dbUpdateTaskList({
          id,
          title: asStr(input.title, 'title'),
          index: existing.index,
          status: existing.status,
          task: undefined,
        });
        return { ok: true, taskListId: id };
      },
    },
    {
      name: 'task-create',
      description:
        'Creates a task inside an existing task list. Provide title and the taskListId.',
      inputSchema: {
        type: 'object',
        properties: {
          taskListId: str('The task list id to add the task to.'),
          ...taskProperties(),
        },
        required: ['taskListId', 'title'],
      },
      async execute(input) {
        assertWritable('creating a task');
        requireAuthUser();
        return createTask(input);
      },
    },
    {
      name: 'task-create-many',
      description:
        'Creates up to 50 tasks in one existing task list. Every item is validated before the first write. Writes are ordered and non-atomic; per-item idempotency keys make retrying safe.',
      inputSchema: {
        type: 'object',
        properties: {
          taskListId: str('The task list id to add all tasks to.'),
          tasks: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            description: 'Ordered tasks to create.',
            items: {
              type: 'object',
              properties: taskProperties(),
              required: ['title'],
            },
          },
        },
        required: ['taskListId', 'tasks'],
      },
      async execute(input) {
        assertWritable('creating tasks');
        requireAuthUser();
        return createTaskBatch(
          asStr(input.taskListId, 'taskListId'),
          requireBatch(input.tasks, 'tasks'),
        );
      },
    },
    {
      name: 'task-get',
      description: 'Returns a task from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: { taskId: str('The task id.') },
        required: ['taskId'],
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        requireAuthUser();
        const id = asStr(input.taskId, 'taskId');
        const task = useBoundStore.getState().task[id];
        if (!task) throw new Error(`Task ${id} is not loaded.`);
        return { ok: true, task };
      },
    },
    {
      name: 'task-update',
      description:
        'Updates an existing task (title, description, status, due date). Only provided fields are changed.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: str('The task id.'),
          title: str('New title.'),
          description: str('New description.'),
          status: int(
            'New status: 0=todo, 1=in-progress, 2=done, 3=archived, 4=cancelled.',
          ),
          dueAt: epochOrIso('New due time (ISO-8601 or epoch ms).'),
          done: {
            ...str('Set to "true" to mark done, "false" to mark not done.'),
            enum: ['true', 'false'],
          },
        },
        required: ['taskId'],
      },
      async execute(input) {
        assertWritable('updating a task');
        requireAuthUser();
        const id = asStr(input.taskId, 'taskId');
        const existing = useBoundStore.getState().task[id];
        if (!existing) throw new Error(`Task ${id} is not loaded.`);
        let status = existing.status;
        let completedAt = existing.completedAt;
        if (input.status !== undefined) {
          status = Number(input.status);
          if (!VALID_STATUS.includes(status))
            throw new Error('status is out of range');
          completedAt = status === TaskStatus.Done ? Date.now() : null;
        } else if (input.done !== undefined) {
          const done = input.done === 'true';
          status = done ? TaskStatus.Done : TaskStatus.Todo;
          completedAt = done ? Date.now() : null;
        }
        const dueAt = toEpochMs(input.dueAt, 'dueAt');
        await dbUpdateTask({
          id,
          index: existing.index,
          title: (input.title as string | undefined) ?? existing.title,
          description:
            (input.description as string | undefined) ?? existing.description,
          status,
          dueAt: dueAt !== undefined ? dueAt : existing.dueAt,
          completedAt,
        });
        return { ok: true, taskId: id, status };
      },
    },
  ];
}
