<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    private const SOURCES = [
        'trips' => ['table' => 'trips', 'scope' => 'id'],
        'activities' => ['table' => 'activities', 'scope' => 'trip_id'],
        'accommodations' => ['table' => 'accommodations', 'scope' => 'trip_id'],
        'macroplans' => ['table' => 'macro_plans', 'scope' => 'trip_id'],
        'expenses' => ['table' => 'expenses', 'scope' => 'trip_id'],
        'task_lists' => ['table' => 'task_lists', 'scope' => 'trip_id'],
        'tasks' => ['table' => 'tasks', 'scope' => 'trip_id'],
        'comment_groups' => ['table' => 'comment_groups', 'scope' => 'trip_id'],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $since = max(0, $request->integer('since', 0));
        $tripId = $request->query('tripId');
        $limit = min(max($request->integer('limit', 250), 1), 1000);

        if ($tripId) {
            $trip = Trip::findOrFail($tripId);
            abort_unless($trip->sharing_level >= 2 || $this->isMember($trip, $request), 403);
        } elseif (!$request->user()) {
            return response()->json(['message' => 'Authentication required.'], 401);
        }

        $changes = [];
        $nextCursor = $since;
        foreach (self::SOURCES as $entity => $source) {
            $query = DB::table($source['table'])
                ->where($source['table'] . '.updated_at_ms', '>', $since)
                ->orderBy($source['table'] . '.updated_at_ms')
                ->limit($limit);
            if ($tripId && $entity === 'tasks') {
                $query->join('task_lists', 'task_lists.id', '=', 'tasks.task_list_id')
                    ->where('task_lists.trip_id', $tripId)
                    ->select('tasks.*');
            } elseif ($tripId) {
                $query->where($source['scope'], $tripId);
            }
            $rows = $query->get();
            foreach ($rows as $row) {
                $data = (array) $row;
                $updated = (int) ($data['updated_at_ms'] ?? $since);
                $nextCursor = max($nextCursor, $updated);
                $changes[] = [
                    'entity' => $entity,
                    'id' => (string) $data['id'],
                    'updatedAt' => $updated,
                    'op' => 'upsert',
                    'data' => $data,
                ];
            }
        }

        usort($changes, fn (array $a, array $b): int => $a['updatedAt'] <=> $b['updatedAt']);
        return response()->json([
            'changes' => array_slice($changes, 0, $limit),
            'nextCursor' => $nextCursor,
        ]);
    }

    private function isMember(Trip $trip, Request $request): bool
    {
        return $request->user() !== null
            && $trip->users()->whereKey($request->user()->getKey())->exists();
    }
}