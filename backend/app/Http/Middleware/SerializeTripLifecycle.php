<?php

namespace App\Http\Middleware;

use App\Models\Trip;
use App\Models\User;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class SerializeTripLifecycle
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        if (! $route || ! $request->user() || $request->isMethodSafe()) {
            return $next($request);
        }
        // Account deletion locks all active admins before its target user and
        // affected trips. Do not reverse that lock order here.
        if ($route->uri() === 'api/users/me' && $request->isMethod('DELETE')) {
            return $next($request);
        }
        $actor = $request->user();
        if ($request->is('api/admin/*') && (! $actor instanceof User || ! $actor->isAdmin())) {
            return $next($request);
        }

        $tripId = $this->id($route->parameter('trip'));
        if (! $tripId) {
            foreach (['activity' => 'activities', 'taskList' => 'task_lists', 'task' => 'tasks', 'comment' => 'comments', 'group' => 'comment_groups', 'member' => 'trip_user', 'entityId' => null] as $parameter => $table) {
                $id = $this->id($route->parameter($parameter));
                if (! $id) {
                    continue;
                }
                $table ??= match ($route->parameter('entity')) {
                    'activities' => 'activities',
                    'accommodations' => 'accommodations',
                    'macroplans' => 'macro_plans',
                    'expenses' => 'expenses',
                    default => null,
                };
                if ($table === 'tasks') {
                    $tripId = DB::table('tasks')->join('task_lists', 'tasks.task_list_id', '=', 'task_lists.id')
                        ->where('tasks.id', $id)->value('task_lists.trip_id');
                } elseif ($table === 'comments') {
                    $tripId = DB::table('comments')->join('comment_groups', 'comments.comment_group_id', '=', 'comment_groups.id')
                        ->where('comments.id', $id)->value('comment_groups.trip_id');
                } elseif ($table !== null) {
                    $tripId = DB::table($table)->where('id', $id)->value('trip_id');
                }
                break;
            }
        }

        return DB::transaction(function () use ($tripId, $request, $next, $route, $actor): Response {
            // Also serialize trip creation and authored comments with account
            // deletion. Authentication may have run before a competing delete.
            $user = User::whereKey($actor->getAuthIdentifier())->lockForUpdate()->first();
            abort_unless($user !== null, 401);
            $request->setUserResolver(fn () => $user);
            if ($tripId) {
                // All mutations share this lock, before access checks, audit
                // snapshots, descendant reads, or sync-event writes.
                $trip = Trip::withTrashed()->whereKey($tripId)->lockForUpdate()->firstOrFail();
                abort_if($trip->trashed() && ! str_ends_with($route->uri(), '/restore'), 404);
                // Route model binding can precede a wait for the lock. Reload
                // models so deleted children and stale relationships cannot be
                // used by direct-by-ID controllers after that wait.
                foreach ($route->parameters() as $name => $parameter) {
                    if ($parameter instanceof Model) {
                        $route->setParameter($name, $parameter->newQuery()->findOrFail($parameter->getKey()));
                    }
                }
            }
            $response = $next($request);
            if ($response->getStatusCode() >= 400) {
                throw new HttpResponseException($response);
            }

            return $response;
        }, 3);
    }

    private function id(mixed $value): ?string
    {
        if ($value instanceof Model) {
            return (string) $value->getKey();
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
