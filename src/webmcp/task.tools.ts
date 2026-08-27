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

export function createTaskTools(): WebMCPTool[] {
  return [
    {
      name: 'task-list-create',
      description:
        'Creates a task list (column) within a trip. Tasks are created under a task-list id.',
      inputSchema: {
        type: 'object',
        properties: {
          tripId: str('Trip id. Defaults to the currently open trip.'),
          idempotencyKey: idempotencyKeySchema(),
          title: str('Task list title.'),
        },
        required: ['title'],
      },
      async execute(input) {
        assertWritable('creating a task list');
        requireAuthUser();
        const tripId = resolveTripId(input.tripId);
        requireLoadedTrip(tripId);
        const title = asStr(input.title, 'title');
        return runIdempotent(
          'task-list-create',
          tripId,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddTaskList(
              { title, index: 0, status: 0 },
              { tripId },
            );
            return { ok: true, id: result.id, taskListId: result.id };
          },
        );
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
          idempotencyKey: idempotencyKeySchema(),
          title: str('Task title.'),
          description: str('Optional description.'),
          status: int(
            'Task status: 0=todo, 1=in-progress, 2=done, 3=archived, 4=cancelled. Default 0.',
          ),
          dueAt: epochOrIso('Optional due time (ISO-8601 or epoch ms).'),
        },
        required: ['taskListId', 'title'],
      },
      async execute(input) {
        assertWritable('creating a task');
        requireAuthUser();
        const taskListId = asStr(input.taskListId, 'taskListId');
        const existingList = useBoundStore.getState().taskList[taskListId];
        if (!existingList)
          throw new Error(`Task list ${taskListId} is not loaded.`);
        const status =
          input.status !== undefined ? Number(input.status) : TaskStatus.Todo;
        if (!VALID_STATUS.includes(status))
          throw new Error('status is out of range');
        const dueAt = toEpochMs(input.dueAt, 'dueAt');
        const data = {
          index: existingList.taskIds.length,
          title: asStr(input.title, 'title'),
          description: (input.description as string | undefined) ?? '',
          status,
          dueAt: dueAt ?? null,
          completedAt: status === TaskStatus.Done ? Date.now() : null,
        };
        return runIdempotent(
          'task-create',
          taskListId,
          input.idempotencyKey,
          input,
          async () => {
            const result = await dbAddTask(data, { taskListId });
            return { ok: true, id: result.id, taskId: result.id };
          },
        );
      },
    },
    {
      name: 'task-get',
      description: 'Returns a task from the locally loaded state by id.',
      inputSchema: {
        type: 'object',
        properties: {
          taskId: str('The task id.'),
        },
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
