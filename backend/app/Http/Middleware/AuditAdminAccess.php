<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuditAdminAccess
{
    private const DIRECT_TABLES = [
        'activity' => 'activities',
        'taskList' => 'task_lists',
        'group' => 'comment_groups',
        'member' => 'trip_user',
        'activities' => 'activities',
        'accommodations' => 'accommodations',
        'macroplans' => 'macro_plans',
        'expenses' => 'expenses',
        'task-lists' => 'task_lists',
        'comment-groups' => 'comment_groups',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $actor = $request->user();
        if (! $actor instanceof User || ! $actor->isAdmin() || $request->is('api/admin/audit-events')) {
            return $next($request);
        }

        $route = $request->route();
        if (! $route) {
            return $next($request);
        }

        $tripId = $this->id($route->parameter('trip'));
        if (! $tripId && $request->is('api/sync')) {
            $tripId = $this->id($request->query('tripId'));
        }
        $targetType = 'trip';
        $targetId = $tripId;
        $table = $tripId ? 'trips' : null;

        foreach (['entityId', 'comment', 'task', 'activity', 'taskList', 'group', 'member'] as $parameter) {
            $id = $this->id($route->parameter($parameter));
            if (! $id) {
                continue;
            }
            $targetType = $parameter === 'entityId' ? (string) $route->parameter('entity') : $parameter;
            $targetId = $id;
            $table = self::DIRECT_TABLES[$targetType] ?? match ($targetType) {
                'task', 'tasks' => 'tasks',
                'comment', 'comments' => 'comments',
                default => null,
            };
            $tripId ??= $this->tripFor($table, $id);
            break;
        }

        if (! $tripId && $request->is('api/admin/users*')) {
            $targetType = 'user';
            $targetId = $this->id($route->parameter('user'));
            $table = $targetId ? 'users' : null;
        }

        if (! $tripId && ! $request->is('api/admin/users*')) {
            return $next($request);
        }

        // A trip owner is using ordinary trip access, even if their account is admin.
        if ($tripId && DB::table('trip_user')->where('trip_id', $tripId)
            ->where('user_id', $actor->id)->where('role', 0)->exists()) {
            return $next($request);
        }

        $record = fn (): Response => $this->auditRequest($request, $next, $actor, $tripId, $targetType, $targetId, $table);

        return $request->isMethod('GET') ? $record() : DB::transaction($record);
    }

    private function auditRequest(Request $request, Closure $next, User $actor, ?string $tripId, string $targetType, ?string $targetId, ?string $table): Response
    {
        $route = $request->route();
        abort_unless($route instanceof Route, 500);
        $before = $this->snapshot($table, $targetId);
        $response = $next($request);
        if ($response->getStatusCode() >= 400) {
            if (! $request->isMethod('GET')) {
                throw new HttpResponseException($response);
            }

            return $response;
        }

        $action = $this->action($request);
        $details = ['route' => $route->uri()];
        if ($request->isMethod('GET')) {
            $details['fields'] = [];
        } else {
            $after = $this->snapshot($table, $targetId);
            $details['fields'] = $this->changedFields($before, $after);
            // Batch and create endpoints can change more than their URL target.
            $details['submittedFields'] = array_values(array_diff(array_keys($request->except('_token')), ['password', 'resetToken']));
            if ($action === 'create' && $tripId) {
                $uri = $route->uri();
                $entity = $route->parameter('entity');
                foreach (['activities', 'task-lists', 'tasks', 'comment-groups', 'members'] as $resource) {
                    if (str_ends_with($uri, '/' . $resource)) {
                        $entity = $resource;
                        break;
                    }
                }
                if (is_string($entity)) {
                    $targetType = $entity;
                    $targetId = null;
                    if ($response instanceof JsonResponse) {
                        $createdId = $response->getData(true)['id'] ?? null;
                        if (is_string($createdId)) {
                            $targetId = $createdId;
                        }
                    }
                }
            }
        }

        DB::table('admin_audit_events')->insert([
            'actor_user_id' => $actor->id,
            'actor_handle' => $actor->handle,
            'trip_id' => $tripId,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'action' => $action,
            'details' => json_encode($details, JSON_THROW_ON_ERROR),
            'created_at_ms' => now()->getTimestampMs(),
        ]);

        return $response;
    }

    private function id(mixed $value): ?string
    {
        if ($value instanceof Model) {
            return (string) $value->getKey();
        }

        return is_string($value) && $value !== '' ? $value : null;
    }

    private function tripFor(?string $table, string $id): ?string
    {
        if (! $table) {
            return null;
        }
        if ($table === 'tasks') {
            return DB::table('tasks')->join('task_lists', 'tasks.task_list_id', '=', 'task_lists.id')
                ->where('tasks.id', $id)->value('task_lists.trip_id');
        }
        if ($table === 'comments') {
            return DB::table('comments')->join('comment_groups', 'comments.comment_group_id', '=', 'comment_groups.id')
                ->where('comments.id', $id)->value('comment_groups.trip_id');
        }

        return DB::table($table)->where('id', $id)->value('trip_id');
    }

    /** @return array<string, mixed> */
    private function snapshot(?string $table, ?string $id): array
    {
        if (! $table || ! $id) {
            return [];
        }

        return (array) (DB::table($table)->where('id', $id)->first() ?? []);
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @return list<string>
     */
    private function changedFields(array $before, array $after): array
    {
        $fields = [];
        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $field) {
            if (in_array($field, ['created_at_ms', 'updated_at_ms', 'password_hash', 'reset_token', 'reset_token_at'], true)) {
                continue;
            }
            if (($before[$field] ?? null) !== ($after[$field] ?? null)) {
                $fields[] = $field;
            }
        }

        return $fields;
    }

    private function action(Request $request): string
    {
        $uri = $request->route()?->uri() ?? '';
        if ($request->isMethod('GET')) {
            return 'view';
        }
        if (str_ends_with($uri, '/restore')) {
            return 'restore';
        }
        if ($request->isMethod('DELETE')) {
            return 'delete';
        }
        if (str_ends_with($uri, '/duplicate')) {
            return 'duplicate';
        }
        if (str_ends_with($uri, '/move') || str_ends_with($uri, '/drag-end')) {
            return 'move';
        }
        if (str_ends_with($uri, '/reorder') || str_ends_with($uri, '/index')) {
            return 'reorder';
        }

        return $request->isMethod('POST') && ! str_ends_with($uri, '/update') ? 'create' : 'update';
    }
}
