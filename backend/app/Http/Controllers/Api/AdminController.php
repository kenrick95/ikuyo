<?php

namespace App\Http\Controllers\Api;

use App\Enums\CommentObjectType;
use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    private const CONTENT = [
        'activities' => Activity::class,
        'accommodations' => Accommodation::class,
        'macroplans' => MacroPlan::class,
        'expenses' => Expense::class,
        'task-lists' => TaskList::class,
        'tasks' => Task::class,
        'comment-groups' => CommentGroup::class,
        'comments' => Comment::class,
    ];

    public function users(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = User::query()->select(['id', 'handle', 'email', 'role']);
        if ($search !== '') {
            $query->where(fn (Builder $q) => $q
                ->where('handle', 'like', '%' . $search . '%')
                ->orWhere('email', 'like', '%' . $search . '%'));
        }

        return response()->json($query->orderBy('handle')->limit(30)->get());
    }

    public function trips(Request $request, User $user): JsonResponse
    {
        $trips = Trip::withTrashed()->whereHas('users', fn (Builder $q) => $q->whereKey($user->id))
            ->orderByDesc('created_at_ms')->orderBy('id')
            ->cursorPaginate(min(max($request->integer('limit', 50), 1), 100));

        return response()->json(['data' => collect($trips->items())->map(fn (Trip $trip): array => [
            'id' => $trip->id,
            'title' => $trip->title,
            'createdAt' => $trip->created_at_ms,
            'archivedAt' => $trip->archived_at_ms,
            'deletedAt' => $trip->trashed() ? $trip->getRawOriginal('deleted_at') : null,
        ])->values(), 'nextCursor' => $trips->nextCursor()?->encode(), 'hasMore' => $trips->hasMorePages()]);
    }

    public function content(string $trip): JsonResponse
    {
        Trip::withTrashed()->findOrFail($trip);
        $items = [];
        foreach (array_keys(self::CONTENT) as $entity) {
            foreach ($this->contentQuery($trip, $entity, 'all')->limit(500)->get() as $record) {
                $items[] = [
                    'entity' => $entity,
                    'id' => $record->id,
                    'label' => (string) ($record->title ?? $record->name ?? $record->content ?? $record->id),
                    'deletedAt' => $record->trashed() ? $record->getRawOriginal('deleted_at') : null,
                ];
            }
        }

        return response()->json($items);
    }

    public function deleteTrip(string $trip): JsonResponse
    {
        Trip::findOrFail($trip)->delete();

        return response()->json(['ok' => true]);
    }

    public function restoreTrip(string $trip): JsonResponse
    {
        Trip::onlyTrashed()->findOrFail($trip)->restore();

        return response()->json(['ok' => true]);
    }

    public function deleteContent(string $trip, string $entity, string $entityId): JsonResponse
    {
        Trip::findOrFail($trip);
        $record = $this->contentQuery($trip, $entity)->whereKey($entityId)->firstOrFail();
        DB::transaction(function () use ($record, $entity): void {
            if ($record instanceof TaskList) {
                foreach ($record->tasks as $task) {
                    $this->softDeleteTargetComments('tasks', (string) $task->getKey());
                }
            }
            if ($record instanceof CommentGroup) {
                $this->softDeleteCommentGroup($record);

                return;
            }
            $this->softDeleteTargetComments($entity, (string) $record->getKey());
            $record->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function restoreContent(string $trip, string $entity, string $entityId): JsonResponse
    {
        Trip::findOrFail($trip);
        $record = $this->contentQuery($trip, $entity, 'deleted')->whereKey($entityId)->firstOrFail();
        if ($entity === 'tasks') {
            abort_unless(TaskList::whereKey($record->getAttribute('task_list_id'))->exists(), 409, 'Restore the task list first.');
        }
        if ($entity === 'comments') {
            abort_unless(CommentGroup::whereKey($record->getAttribute('comment_group_id'))->exists(), 409, 'Restore the comment group first.');
        }
        DB::transaction(function () use ($record): void {
            $record->restore();
            if ($record instanceof CommentGroup) {
                CommentGroupObject::onlyTrashed()->where('comment_group_id', $record->id)->first()?->restore();
                foreach (Comment::onlyTrashed()->where('comment_group_id', $record->id)->get() as $comment) {
                    $comment->restore();
                }
            }
        });

        return response()->json(['ok' => true]);
    }

    /** @return Builder<Activity>|Builder<Accommodation>|Builder<MacroPlan>|Builder<Expense>|Builder<TaskList>|Builder<Task>|Builder<CommentGroup>|Builder<Comment> */
    private function contentQuery(string $trip, string $entity, string $scope = 'active'): Builder
    {
        $model = self::CONTENT[$entity] ?? null;
        abort_unless($model !== null, 404);

        $query = match ($scope) {
            'all' => $model::withTrashed(),
            'deleted' => $model::onlyTrashed(),
            default => $model::query(),
        };
        $query->withoutGlobalScope('activeTrip')->withoutGlobalScope('activeParent');
        if ($entity === 'tasks') {
            return $query->whereIn('task_list_id', TaskList::withTrashed()->withoutGlobalScope('activeTrip')->where('trip_id', $trip)->select('id'));
        }
        if ($entity === 'comments') {
            return $query->whereIn('comment_group_id', CommentGroup::withTrashed()->withoutGlobalScope('activeTrip')->where('trip_id', $trip)->select('id'));
        }

        return $query->where('trip_id', $trip);
    }

    private function softDeleteTargetComments(string $entity, string $id): void
    {
        if (! in_array($entity, ['activities', 'accommodations', 'macroplans', 'expenses', 'tasks'], true)) {
            return;
        }
        $object = CommentGroupObject::where('object_type', CommentObjectType::fromEntity($entity)->value)
            ->where('object_id', $id)->first();
        if ($object) {
            $group = CommentGroup::find($object->comment_group_id);
            if ($group) {
                $this->softDeleteCommentGroup($group);
            }
        }
    }

    private function softDeleteCommentGroup(CommentGroup $group): void
    {
        foreach ($group->comments as $comment) {
            $comment->delete();
        }
        $group->object?->delete();
        $group->delete();
    }
}
