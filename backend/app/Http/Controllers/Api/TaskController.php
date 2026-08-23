<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TaskController extends Controller
{
    public function storeList(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'index' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'integer'],
        ]);
        $list = $trip->taskLists()->create([
            'id' => (string) Str::uuid(),
            ...$data,
        ]);
        return response()->json($list, 201);
    }

    public function updateList(Request $request, Trip $trip, string $taskList): JsonResponse
    {
        $list = $this->list($trip, $taskList);
        $list->update($request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'index' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'integer'],
        ]));
        return response()->json($list->fresh('tasks'));
    }

    public function destroyList(Trip $trip, string $taskList): JsonResponse
    {
        $this->list($trip, $taskList)->delete();
        return response()->json(['ok' => true]);
    }

    public function storeTaskById(Request $request, TaskList $taskList): JsonResponse
    {
        abort_unless($request->user(), 401);
        $taskList->load('trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($taskList->trip, $request->user()), 403);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'index' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'integer'],
            'dueAt' => ['nullable', 'integer'],
            'completedAt' => ['nullable', 'integer'],
        ]);
        $task = $taskList->tasks()->create([
            'id' => (string) Str::uuid(),
            'title' => $data['title'],
            'description' => empty($data['description']) ? null : $data['description'],
            'index' => $data['index'],
            'status' => $data['status'],
            'due_at_ms' => empty($data['dueAt'] ?? null) ? null : ($data['dueAt'] ?? null),
            'completed_at_ms' => empty($data['completedAt'] ?? null) ? null : ($data['completedAt'] ?? null),
        ]);
        return response()->json($task, 201);
    }

    public function storeTask(Request $request, Trip $trip, string $taskList): JsonResponse
    {
        $list = $this->list($trip, $taskList);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'index' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'integer'],
            'dueAt' => ['nullable', 'integer'],
            'completedAt' => ['nullable', 'integer'],
        ]);
        $task = $list->tasks()->create([
            'id' => (string) Str::uuid(),
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'index' => $data['index'],
            'status' => $data['status'],
            'due_at_ms' => $data['dueAt'] ?? null,
            'completed_at_ms' => $data['completedAt'] ?? null,
        ]);
        return response()->json($task, 201);
    }

    public function updateTask(Request $request, Trip $trip, string $taskList, string $task): JsonResponse
    {
        $record = $this->task($trip, $taskList, $task);
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'index' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'integer'],
            'dueAt' => ['nullable', 'integer'],
            'completedAt' => ['nullable', 'integer'],
        ]);
        $record->update([
            ...array_filter([
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'index' => $data['index'] ?? null,
                'status' => $data['status'] ?? null,
            ], static fn ($value): bool => $value !== null),
        ]);
        // Persist nullable fields explicitly when present (even if null).
        foreach (['dueAt' => 'due_at_ms', 'completedAt' => 'completed_at_ms'] as $field => $col) {
            if (array_key_exists($field, $data)) $record->update([$col => $data[$field]]);
        }
        return response()->json($record->fresh());
    }

    public function destroyTask(Trip $trip, string $taskList, string $task): JsonResponse
    {
        $this->task($trip, $taskList, $task)->delete();
        return response()->json(['ok' => true]);
    }

    public function updateListById(Request $request, TaskList $taskList): JsonResponse
    {
        abort_unless($request->user(), 401);
        $taskList->load('trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($taskList->trip, $request->user()), 403);
        $data = $request->validate(['title' => ['sometimes', 'string', 'max:255'], 'index' => ['sometimes', 'integer', 'min:0'], 'status' => ['sometimes', 'integer']]);
        $taskList->update($data);
        return response()->json($taskList->fresh('tasks'));
    }

    public function destroyById(Request $request, Task $task): JsonResponse
    {
        abort_unless($request->user(), 401);
        $task->load('taskList.trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($task->taskList->trip, $request->user()), 403);
        DB::transaction(function () use ($task): void {
            $this->deleteTaskComments($task->id);
            $task->delete();
        });
        return response()->json(['ok' => true]);
    }

    public function destroyListById(Request $request, TaskList $taskList): JsonResponse
    {
        abort_unless($request->user(), 401);
        $taskList->load('trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($taskList->trip, $request->user()), 403);
        DB::transaction(function () use ($taskList): void {
            foreach ($taskList->tasks as $task) $this->deleteTaskComments($task->id);
            $taskList->delete();
        });
        return response()->json(['ok' => true]);
    }

    private function deleteTaskComments(string $taskId): void
    {
        $object = \App\Models\CommentGroupObject::where('object_type', 5)->where('object_id', $taskId)->first();
        if (!$object) return;
        $group = $object->commentGroup;
        if ($group) {
            $group->comments()->delete();
            $group->delete();
        }
        $object->delete();
    }

    public function reorderTasks(Request $request, Trip $trip): JsonResponse
    {
        $items = $request->validate(['tasks' => ['required', 'array'], 'tasks.*.id' => ['required', 'string'], 'tasks.*.index' => ['required', 'integer', 'min:0']])['tasks'];
        DB::transaction(function () use ($items, $trip): void {
            foreach ($items as $item) {
                Task::whereKey($item['id'])->whereHas('taskList', fn ($q) => $q->where('trip_id', $trip->id))->update(['index' => $item['index'], 'updated_at_ms' => nowMs()]);
            }
        });
        return response()->json(['ok' => true]);
    }

    public function reorderLists(Request $request, Trip $trip): JsonResponse
    {
        $items = $request->validate(['taskLists' => ['required', 'array'], 'taskLists.*.id' => ['required', 'string'], 'taskLists.*.index' => ['required', 'integer', 'min:0']])['taskLists'];
        foreach ($items as $item) {
            TaskList::whereKey($item['id'])->where('trip_id', $trip->id)->update(['index' => $item['index'], 'updated_at_ms' => nowMs()]);
        }
        return response()->json(['ok' => true]);
    }

    public function reorderById(Request $request, Task $task): JsonResponse
    {
        abort_unless($request->user(), 401);
        $task->load('taskList.trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($task->taskList->trip, $request->user()), 403);
        $data = $request->validate(['index' => ['required', 'integer', 'min:0']]);
        $task->update(['index' => $data['index']]);
        return response()->json($task->fresh());
    }

    public function moveById(Request $request, Task $task): JsonResponse
    {
        abort_unless($request->user(), 401);
        $task->load('taskList.trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($task->taskList->trip, $request->user()), 403);
        $data = $request->validate(['toTaskListId' => ['required', 'string'], 'newIndex' => ['required', 'integer', 'min:0']]);
        $target = $task->taskList->trip->taskLists()->whereKey($data['toTaskListId'])->firstOrFail();
        $task->update(['task_list_id' => $target->id, 'index' => $data['newIndex']]);
        return response()->json($task->fresh());
    }

    public function updateById(Request $request, Task $task): JsonResponse
    {
        abort_unless($request->user(), 401);
        $task->load('taskList.trip');
        $access = app(\App\Services\TripAccessService::class);
        abort_unless($access->canEdit($task->taskList->trip, $request->user()), 403);
        $data = $request->validate(['title' => ['sometimes', 'string', 'max:255'], 'description' => ['nullable', 'string'], 'index' => ['sometimes', 'integer', 'min:0'], 'status' => ['sometimes', 'integer'], 'dueAt' => ['nullable', 'integer'], 'completedAt' => ['nullable', 'integer']]);
        $updates = [];
        foreach (['title', 'description', 'index', 'status', 'dueAt', 'completedAt'] as $field) {
            if (array_key_exists($field, $data)) $updates[$this->dbField($field)] = $data[$field];
        }
        $task->update($updates);
        return response()->json($task->fresh());
    }

    private function dbField(string $field): string
    {
        return ['title' => 'title', 'description' => 'description', 'index' => 'index', 'status' => 'status', 'dueAt' => 'due_at_ms', 'completedAt' => 'completed_at_ms'][$field];
    }

    public function moveTask(Request $request, Trip $trip, string $task): JsonResponse
    {
        $data = $request->validate(['toTaskListId' => ['required', 'string'], 'newIndex' => ['required', 'integer', 'min:0']]);
        $taskRecord = Task::whereKey($task)->whereHas('taskList', fn ($q) => $q->where('trip_id', $trip->id))->firstOrFail();
        $target = $trip->taskLists()->whereKey($data['toTaskListId'])->firstOrFail();
        DB::transaction(function () use ($taskRecord, $target, $data): void {
            $taskRecord->update(['task_list_id' => $target->id, 'index' => $data['newIndex']]);
        });
        return response()->json($taskRecord->fresh());
    }

    private function list(Trip $trip, string $id): TaskList
    {
        return $trip->taskLists()->whereKey($id)->firstOrFail();
    }

    private function task(Trip $trip, string $listId, string $id): Task
    {
        return $this->list($trip, $listId)->tasks()->whereKey($id)->firstOrFail();
    }
}

function nowMs(): int
{
    return (int) round(microtime(true) * 1000);
}