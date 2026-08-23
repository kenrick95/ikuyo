<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\TripUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SyncController extends Controller
{
    private const SOURCES = [
        'trips' => ['table' => 'trips', 'scope' => 'id'],
        'trip_user' => ['table' => 'trip_user', 'scope' => 'trip_id'],
        'activities' => ['table' => 'activities', 'scope' => 'trip_id'],
        'accommodations' => ['table' => 'accommodations', 'scope' => 'trip_id'],
        'macroplans' => ['table' => 'macro_plans', 'scope' => 'trip_id'],
        'expenses' => ['table' => 'expenses', 'scope' => 'trip_id'],
        'task_lists' => ['table' => 'task_lists', 'scope' => 'trip_id'],
        'tasks' => ['table' => 'tasks', 'scope' => 'trip_id'],
        'comment_groups' => ['table' => 'comment_groups', 'scope' => 'trip_id'],
        'comment_group_objects' => ['table' => 'comment_group_objects', 'scope' => 'trip_id'],
        'comments' => ['table' => 'comments', 'scope' => 'trip_id'],
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $since = max(0, $request->integer('since', 0));
        $cursorId = $request->query('cursorId');
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
        $nextCursorId = $cursorId ?? '';
        foreach (self::SOURCES as $entity => $source) {
            $query = DB::table($source['table'])
                ->select($source['table'] . '.*')
                // Composite cursor: strictly after (updated_at_ms, id) prevents missing
                // rows that share the same millisecond across pages.
                ->where(function ($q) use ($source, $since, $cursorId): void {
                    $q->where($source['table'] . '.updated_at_ms', '>', (int) $since)
                        ->orWhere(fn ($qq) => $qq
                            ->where($source['table'] . '.updated_at_ms', (int) $since)
                            ->where($source['table'] . '.id', '>', (string) ($cursorId ?? '')));
                })
                ->orderBy($source['table'] . '.updated_at_ms')
                ->orderBy($source['table'] . '.id')
                ->limit($limit);

            if ($tripId && $entity === 'tasks') {
                $query->join('task_lists', 'task_lists.id', '=', 'tasks.task_list_id')
                    ->where('task_lists.trip_id', $tripId)
                    ->select('tasks.*');
            } elseif ($tripId && $entity === 'comments') {
                $query->join('comment_groups', 'comment_groups.id', '=', 'comments.comment_group_id')
                    ->where('comment_groups.trip_id', $tripId)
                    ->select('comments.*');
            } elseif ($tripId && $entity === 'comment_group_objects') {
                $query->join('comment_groups', 'comment_groups.id', '=', 'comment_group_objects.comment_group_id')
                    ->where('comment_groups.trip_id', $tripId)
                    ->select('comment_group_objects.*');
            } elseif ($tripId && $entity === 'trip_user') {
                $query->where('trip_user.trip_id', $tripId);
            } elseif ($tripId && $source['scope'] !== 'id') {
                $query->where($source['table'] . '.' . $source['scope'], $tripId);
            }

            $rows = $query->get();
            foreach ($rows as $row) {
                $data = (array) $row;
                $updated = (int) ($data['updated_at_ms'] ?? $since);
                // Advance the composite cursor conservatively (max ensures monotonicity).
                if (($updated > $nextCursor) || ($updated === $nextCursor && (string) ($data['id'] ?? '') > (string) ($nextCursorId ?? ''))) {
                    $nextCursor = $updated;
                    $nextCursorId = (string) $data['id'];
                }
                $changes[] = ['entity' => $entity, 'id' => (string) $data['id'], 'updatedAt' => $updated, 'op' => 'upsert', 'data' => $data];
            }
        }

        usort($changes, function (array $a, array $b): int {
            $byTime = $a['updatedAt'] <=> $b['updatedAt'];
            return $byTime !== 0 ? $byTime : strcmp((string) $a['id'], (string) $b['id']);
        });
        return response()->json([
            'changes' => array_slice($changes, 0, $limit),
            'nextCursor' => $nextCursor,
            'cursorId' => $nextCursorId,
        ]);
    }

    private function isMember(Trip $trip, Request $request): bool
    {
        return $request->user() !== null
            && $trip->users()->whereKey($request->user()->getKey())->exists();
    }
}