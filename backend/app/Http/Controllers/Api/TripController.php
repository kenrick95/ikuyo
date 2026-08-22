<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $now = (int) $request->integer('now', (int) round(microtime(true) * 1000));
        $userId = $request->user()?->getKey() ?? $request->query('user_id');

        if (!$userId) {
            return response()->json(['message' => 'Authentication required.'], 401);
        }

        $query = Trip::query()
            ->select(['trips.*'])
            ->join('trip_user', 'trip_user.trip_id', '=', 'trips.id')
            ->where('trip_user.user_id', $userId)
            ->distinct();

        if ($request->query('status') === 'active') {
            $query->where('timestamp_end_ms', '>=', $now);
        } elseif ($request->query('status') === 'past') {
            $query->where('timestamp_end_ms', '<', $now);
        }

        $trips = $query->orderBy('timestamp_end_ms', 'desc')
            ->cursorPaginate(min($request->integer('limit', 50), 100));

        return response()->json($trips);
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $limit = min($request->integer('limit', 12), 50);
        $trips = Trip::query()
            ->where('sharing_level', 3)
            ->whereHas('activities')
            ->withCount('activities')
            ->with(['users' => fn ($query) => $query->wherePivot('role', 0)])
            ->orderByDesc('created_at_ms')
            ->cursorPaginate($limit);

        $trips->getCollection()->transform(fn (Trip $trip): array => [
            'id' => $trip->id,
            'title' => $trip->title,
            'timestampStart' => $trip->timestamp_start_ms,
            'timestampEnd' => $trip->timestamp_end_ms,
            'timeZone' => $trip->timezone,
            'createdAt' => $trip->created_at_ms,
            'lastUpdatedAt' => $trip->updated_at_ms,
            'ownerHandle' => $trip->users->first()?->handle,
            'activityCount' => $trip->activities_count,
        ]);

        return response()->json($trips);
    }

    public function show(Trip $trip): JsonResponse
    {
        $trip->load([
            'activities',
            'accommodations',
            'macroPlans',
            'expenses',
            'taskLists.tasks',
            'users',
            'commentGroups.comments.user',
            'commentGroups.object',
        ]);

        return response()->json($this->serializeTrip($trip));
    }

    private function serializeTrip(Trip $trip): array
    {
        return [
            'id' => $trip->id,
            'title' => $trip->title,
            'timestampStart' => $trip->timestamp_start_ms,
            'timestampEnd' => $trip->timestamp_end_ms,
            'timeZone' => $trip->timezone,
            'region' => $trip->region,
            'currency' => $trip->currency,
            'sharingLevel' => $trip->sharing_level,
            'publicShowExpenses' => $trip->public_show_expenses,
            'publicShowTasks' => $trip->public_show_tasks,
            'publicShowComments' => $trip->public_show_comments,
            'viewerShowExpenses' => $trip->viewer_show_expenses,
            'viewerShowTasks' => $trip->viewer_show_tasks,
            'viewerShowComments' => $trip->viewer_show_comments,
            'createdAt' => $trip->created_at_ms,
            'lastUpdatedAt' => $trip->updated_at_ms,
            'activity' => $trip->activities,
            'accommodation' => $trip->accommodations,
            'macroplan' => $trip->macroPlans,
            'expense' => $trip->expenses,
            'taskList' => $trip->taskLists,
            'tripUser' => $trip->users->map(fn ($user): array => [
                'id' => $user->pivot->id ?? null,
                'role' => $user->pivot->role,
                'user' => $user->only(['id', 'handle', 'activated', 'email']),
            ])->values(),
            'commentGroup' => $trip->commentGroups,
        ];
    }
}