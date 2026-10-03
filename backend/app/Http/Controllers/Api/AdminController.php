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

    public function auditEvents(Request $request): JsonResponse
    {
        $trip = $request->query('trip');
        if ($trip !== null) {
            abort_unless(is_string($trip), 422);
            Trip::withTrashed()->findOrFail($trip);
        }

        $query = DB::table('admin_audit_events');
        if ($trip !== null) {
            $query->where('trip_id', $trip);
        }
        $events = $query->orderByDesc('id')->cursorPaginate(min(max($request->integer('limit', 50), 1), 100));
        $items = [];
        foreach ($events->items() as $event) {
            $items[] = [
                'id' => $event->id,
                'actorId' => $event->actor_user_id,
                'actorHandle' => $event->actor_handle,
                'tripId' => $event->trip_id,
                'targetType' => $event->target_type,
                'targetId' => $event->target_id,
                'action' => $event->action,
                'details' => json_decode($event->details, true, 512, JSON_THROW_ON_ERROR),
                'createdAt' => $event->created_at_ms,
            ];
        }

        return response()->json([
            'data' => $items,
            'nextCursor' => $events->nextCursor()?->encode(),
            'hasMore' => $events->hasMorePages(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = User::withTrashed()->select(['id', 'handle', 'email', 'role', 'deleted_at']);
        if ($search !== '') {
            $query->where(fn (Builder $q) => $q
                ->where('handle', 'like', '%' . $search . '%')
                ->orWhere('email', 'like', '%' . $search . '%'));
        }

        return response()->json($query->orderBy('handle')->limit(30)->get()->map(fn (User $user): array => [
            'id' => $user->id,
            'handle' => $user->handle,
            'email' => $user->email,
            'role' => $user->role,
            'deletedAt' => $user->trashed() ? $user->getRawOriginal('deleted_at') : null,
        ]));
    }

    public function user(string $user): JsonResponse
    {
        $record = User::withTrashed()->findOrFail($user);

        return response()->json([
            'id' => $record->id,
            'handle' => $record->handle,
            'email' => $record->email,
            'role' => $record->role,
            'deletedAt' => $record->getRawOriginal('deleted_at'),
        ]);
    }

    public function trip(string $trip): JsonResponse
    {
        $record = Trip::withTrashed()->findOrFail($trip);

        return response()->json([
            'id' => $record->id,
            'title' => $record->title,
            'archivedAt' => $record->archived_at_ms,
            'deletedAt' => $record->getRawOriginal('deleted_at'),
        ]);
    }

    public function trips(Request $request, string $user): JsonResponse
    {
        User::withTrashed()->findOrFail($user);
        $trips = Trip::withTrashed()->whereIn('id', DB::table('trip_user')->where('user_id', $user)->select('trip_id'))
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

    public function deleteUser(Request $request, string $user): JsonResponse
    {
        DB::transaction(function () use ($request, $user): void {
            $target = User::whereKey($user)->lockForUpdate()->firstOrFail();
            abort_if($target->id === $request->user()?->id || $target->isAdmin(), 403);

            $target->forceFill(['reset_token' => null, 'reset_token_at' => null])->save();
            $target->delete();
            DB::table((string) config('session.table', 'sessions'))->where('user_id', $target->id)->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function restoreUser(string $user): JsonResponse
    {
        DB::transaction(function () use ($user): void {
            User::onlyTrashed()->whereKey($user)->lockForUpdate()->firstOrFail()->restore();
        }, 3);

        return response()->json(['ok' => true]);
    }

    public function content(Request $request, string $trip): JsonResponse
    {
        Trip::withTrashed()->findOrFail($trip);
        $limit = min(max($request->integer('limit', 100), 1), 100);
        $cursor = $request->query('cursor');
        $start = 0;
        $after = null;
        if ($cursor !== null) {
            abort_unless(is_string($cursor), 422);
            $decoded = json_decode(base64_decode($cursor, true) ?: '', true);
            abort_unless(is_array($decoded) && isset($decoded['index']) && is_int($decoded['index'])
                && $decoded['index'] >= 0 && $decoded['index'] < count(self::CONTENT)
                && (array_key_exists('after', $decoded) && ($decoded['after'] === null || is_string($decoded['after']))), 422);
            $start = $decoded['index'];
            $after = $decoded['after'];
        }

        $items = [];
        $entities = array_keys(self::CONTENT);
        for ($index = $start; $index < count($entities) && count($items) <= $limit; $index++) {
            $entity = $entities[$index];
            $query = $this->contentQuery($trip, $entity, 'all');
            if ($index === $start && $after !== null) {
                $query->where('id', '>', $after);
            }
            foreach ($query->orderBy('id')->limit($limit + 1 - count($items))->get() as $record) {
                $items[] = [
                    'index' => $index,
                    'data' => [
                        'entity' => $entity,
                        'id' => $record->id,
                        'label' => (string) ($record->title ?? $record->name ?? $record->content ?? $record->id),
                        'deletedAt' => $record->trashed() ? $record->getRawOriginal('deleted_at') : null,
                    ],
                ];
            }
        }

        $hasMore = count($items) > $limit;
        $nextCursor = null;
        if ($hasMore) {
            $last = $items[$limit - 1];
            $nextCursor = base64_encode(json_encode(['index' => $last['index'], 'after' => $last['data']['id']], JSON_THROW_ON_ERROR));
        }

        return response()->json([
            'data' => array_map(fn (array $item): array => $item['data'], array_slice($items, 0, $limit)),
            'nextCursor' => $nextCursor,
            'hasMore' => $hasMore,
        ]);
    }

    public function deleteTrip(string $trip): JsonResponse
    {
        $record = Trip::findOrFail($trip);
        $record->delete();

        return response()->json(['ok' => true, 'deletedAt' => $record->getRawOriginal('deleted_at')]);
    }

    public function restoreTrip(string $trip): JsonResponse
    {
        Trip::onlyTrashed()->findOrFail($trip)->restore();

        return response()->json(['ok' => true, 'deletedAt' => null]);
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
            if ($record instanceof Comment) {
                $group = CommentGroup::findOrFail($record->comment_group_id);
                $record->delete();
                if (! $group->comments()->exists()) {
                    DB::table('comments')->where('id', $record->id)->update(['deleted_with_group' => true]);
                    $group->object()->delete();
                    $group->delete();
                }

                return;
            }
            $this->softDeleteTargetComments($entity, (string) $record->getKey());
            $record->delete();
        });

        return response()->json(['ok' => true]);
    }

    public function restoreContent(string $trip, string $entity, string $entityId): JsonResponse
    {
        DB::transaction(function () use ($trip, $entity, $entityId): void {
            Trip::whereKey($trip)->lockForUpdate()->firstOrFail();
            $record = $this->contentQuery($trip, $entity, 'deleted')->whereKey($entityId)->lockForUpdate()->firstOrFail();
            if ($entity === 'tasks') {
                abort_unless(TaskList::whereKey($record->getAttribute('task_list_id'))->lockForUpdate()->first() !== null, 409, 'Restore the task list first.');
            }
            if ($entity === 'comments') {
                abort_unless(CommentGroup::whereKey($record->getAttribute('comment_group_id'))->lockForUpdate()->first() !== null, 409, 'Restore the comment group first.');
            }
            if ($record instanceof CommentGroup) {
                $object = CommentGroupObject::withTrashed()->withoutGlobalScope('activeParent')
                    ->where('comment_group_id', $record->id)->lockForUpdate()->first();
                $model = match (CommentObjectType::tryFrom((int) $object?->object_type)) {
                    CommentObjectType::Trip => Trip::class,
                    CommentObjectType::Activity => Activity::class,
                    CommentObjectType::Accommodation => Accommodation::class,
                    CommentObjectType::MacroPlan => MacroPlan::class,
                    CommentObjectType::Expense => Expense::class,
                    CommentObjectType::Task => Task::class,
                    default => null,
                };
                abort_unless($object && $model && $model::whereKey($object->object_id)->lockForUpdate()->first() !== null, 409, 'Restore the comment target first.');
            }
            $record->restore();
            if ($record instanceof CommentGroup) {
                CommentGroupObject::onlyTrashed()->where('comment_group_id', $record->id)->first()?->restore();
                foreach (Comment::onlyTrashed()->where('comment_group_id', $record->id)->where('deleted_with_group', true)->get() as $comment) {
                    $comment->restore();
                    $comment->update(['deleted_with_group' => false]);
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
        $group->comments()->update(['deleted_with_group' => true]);
        foreach ($group->comments as $comment) {
            $comment->delete();
        }
        $group->object?->delete();
        $group->delete();
    }
}
