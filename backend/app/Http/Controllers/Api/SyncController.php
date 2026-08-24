<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SyncEvent;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            abort_unless($trip->sharing_level >= 2 || ($user && $trip->users()->whereKey($user->getKey())->exists()), 403);
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
                    ->orWhereHas('users', fn ($q2) => $q2->whereKey($user->getKey())))
                ->pluck('id'));
        }

        $events = $query->get();

        // Section visibility: a non-member public visitor must not receive events
        // (expenses / tasks / comments) hidden by the trip's public_show_* flags.
        if ($trip && $trip->sharing_level >= 2 && ! ($user && $trip->users()->whereKey($user->getKey())->exists())) {
            $hiddenEntities = collect();
            if ($trip->public_show_expenses === false) {
                $hiddenEntities->push('expense');
            }
            if ($trip->public_show_tasks === false) {
                $hiddenEntities->push('task_list', 'task');
            }
            if ($trip->public_show_comments === false) {
                $hiddenEntities->push('comment_group', 'comment');
            }
            $events = $events->reject(fn (SyncEvent $e) => $hiddenEntities->contains($e->entity));
        }

        return response()->json([
            'changes' => $events->map(fn (SyncEvent $event): array => [
                'entity' => $event->entity,
                'id' => $event->entity_id,
                'updatedAt' => $event->created_at_ms,
                'op' => $event->operation,
                'data' => $event->payload,
            ])->values(),
            'nextCursor' => $events->last()?->id ?? $cursor,
        ]);
    }
}
