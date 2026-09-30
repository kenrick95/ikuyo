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
        if (! $route || ! $request->user() || (! $request->isMethod('DELETE') && ! str_ends_with($route->uri(), '/restore'))) {
            return $next($request);
        }
        $actor = $request->user();
        if ($request->is('api/admin/*') && (! $actor instanceof User || ! $actor->isAdmin())) {
            return $next($request);
        }

        $tripId = $this->id($route->parameter('trip'));
        if (! $tripId) {
            foreach (['activity' => 'activities', 'taskList' => 'task_lists', 'task' => 'tasks', 'comment' => 'comments', 'entityId' => null] as $parameter => $table) {
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
        if (! $tripId) {
            return $next($request);
        }

        return DB::transaction(function () use ($tripId, $request, $next): Response {
            // Take the same lock for owner and admin deletion/restoration, before
            // audit snapshots or descendant reads establish a database snapshot.
            Trip::withTrashed()->whereKey($tripId)->lockForUpdate()->firstOrFail();
            $response = $next($request);
            if ($response->getStatusCode() >= 400) {
                throw new HttpResponseException($response);
            }

            return $response;
        });
    }

    private function id(mixed $value): ?string
    {
        if ($value instanceof Model) {
            return (string) $value->getKey();
        }

        return is_string($value) && $value !== '' ? $value : null;
    }
}
