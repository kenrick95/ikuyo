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

        if ($tripId) {
            $trip = Trip::findOrFail($tripId);
            $user = $request->user();
            abort_unless($trip->sharing_level >= 2 || ($user && $trip->users()->whereKey($user->getKey())->exists()), 403);
        } else {
            abort_unless($request->user(), 401);
        }

        $query = SyncEvent::query()
            ->where('id', '>', $cursor)
            ->orderBy('id')
            ->limit($limit);
        if ($tripId) $query->where('trip_id', $tripId);

        $events = $query->get();
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