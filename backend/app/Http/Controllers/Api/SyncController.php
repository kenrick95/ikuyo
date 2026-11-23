<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SyncEvent;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $cursor = max(0, $request->integer('cursor', $request->integer('since', 0)));
        $tripId = $request->query('tripId');
        $limit = min(max($request->integer('limit', 250), 1), 1000);
        $user = $request->user();

        if ($tripId) {
            $trip = Trip::findOrFail($tripId);
            abort_unless($user?->isAdmin() || $trip->sharing_level >= 2 || ($user && $trip->users()->whereKey($user->getKey())->exists()), 403);
        } else {
            abort_unless($user, 401);
            $trip = null;
        }

        $query = SyncEvent::query()
            ->where('id', '>', $cursor)
            ->orderBy('id')
            ->limit($limit);

        if ($trip) {
            $query->where('trip_id', $tripId);
        } else {
            // Without a trip scope we must never leak every trip's events to a
            // logged-in user; restrict to trips they can access (public or member).
            $query->whereIn('trip_id', Trip::query()
                ->where(fn ($q) => $q->where('sharing_level', '>=', 2)
                    ->orWhereHas('users', fn ($member) => $member->whereKey($user->getKey())))
                ->pluck('id'));
        }

        $events = $query->get();

        $nextCursor = $events->last()?->id ?? $cursor;
        // Filter after advancing the cursor, including unscoped polls and viewers.
        // Observer entity names use plural table names; accept legacy aliases too.
        if (! $user?->isAdmin()) {
            $trips = Trip::whereIn('id', $events->pluck('trip_id')->filter()->unique())->get()->keyBy('id');
            $roles = $user ? DB::table('trip_user')->where('user_id', $user->id)->whereIn('trip_id', $trips->keys())->pluck('role', 'trip_id') : collect();
            $events = $events->filter(function (SyncEvent $event) use ($trips, $roles): bool {
                $eventTrip = $trips->get($event->trip_id);
                if (! $eventTrip) {
                    return false;
                }
                $role = $roles->get($eventTrip->id);
                if (in_array($role, [0, 1], true)) {
                    return true;
                }
                $prefix = $role !== null ? 'viewer_show_' : 'public_show_';
                $section = match ($event->entity) {
                    'expense', 'expenses', 'expense_ledger' => 'expenses',
                    'task_list', 'task_lists', 'task', 'tasks' => 'tasks',
                    'comment_group', 'comment_groups', 'comment', 'comments', 'comment_group_objects' => 'comments',
                    default => null,
                };

                return $section === null || $eventTrip->getAttribute($prefix . $section) !== false;
            });
        }

        return response()->json([
            'changes' => $events->map(fn (SyncEvent $event): array => [
                'entity' => $event->entity,
                'id' => $event->entity_id,
                'updatedAt' => $event->created_at_ms,
                'op' => $event->operation,
                'data' => $event->payload,
            ])->values(),
            'nextCursor' => $nextCursor,
        ]);
    }
}
