<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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

        return response()->json([
            'data' => collect($trips->items())->map(fn (Trip $trip): array => [
                'id' => $trip->id,
                'title' => $trip->title,
                'timestampStart' => $trip->timestamp_start_ms,
                'timestampEnd' => $trip->timestamp_end_ms,
                'timeZone' => $trip->timezone,
                'createdAt' => $trip->created_at_ms,
                'lastUpdatedAt' => $trip->updated_at_ms,
            ])->values(),
            'nextCursor' => $trips->nextCursor()?->encode(),
            'hasMore' => $trips->hasMorePages(),
        ]);
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

        return response()->json([
            'data' => $trips->items(),
            'nextCursor' => $trips->nextCursor()?->encode(),
            'hasMore' => $trips->hasMorePages(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'timestampStart' => ['required', 'integer'],
            'timestampEnd' => ['required', 'integer'],
            'timeZone' => ['required', 'string', 'max:64'],
            'region' => ['required', 'string', 'max:8'],
            'currency' => ['required', 'string', 'max:8'],
            'originCurrency' => ['required', 'string', 'max:8'],
            'originRegion' => ['nullable', 'string', 'max:8'],
            'originTimeZone' => ['nullable', 'string', 'max:64'],
        ]);

        $trip = DB::transaction(function () use ($data, $user): Trip {
            $trip = Trip::create([
                'id' => (string) Str::uuid(),
                'title' => $data['title'],
                'timestamp_start_ms' => $data['timestampStart'],
                'timestamp_end_ms' => $data['timestampEnd'],
                'timezone' => $data['timeZone'],
                'region' => $data['region'],
                'currency' => $data['currency'],
                'origin_currency' => $data['originCurrency'],
                'origin_region' => $data['originRegion'] ?? null,
                'origin_timezone' => $data['originTimeZone'] ?? null,
                'sharing_level' => 0,
            ]);
            $trip->users()->attach($user->id, [
                'id' => (string) Str::uuid(),
                'role' => 0,
                'created_at_ms' => (int) round(microtime(true) * 1000),
                'updated_at_ms' => (int) round(microtime(true) * 1000),
            ]);
            return $trip;
        });

        return response()->json($this->serializeTrip($trip->load('users')), 201);
    }

    public function update(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'timestampStart' => ['sometimes', 'integer'],
            'timestampEnd' => ['sometimes', 'integer'],
            'timeZone' => ['sometimes', 'string', 'max:64'],
            'region' => ['sometimes', 'string', 'max:8'],
            'currency' => ['sometimes', 'string', 'max:8'],
            'originCurrency' => ['sometimes', 'string', 'max:8'],
            'originRegion' => ['nullable', 'string', 'max:8'],
            'originTimeZone' => ['nullable', 'string', 'max:64'],
        ]);
        $map = ['title' => 'title', 'timestampStart' => 'timestamp_start_ms', 'timestampEnd' => 'timestamp_end_ms', 'timeZone' => 'timezone', 'region' => 'region', 'currency' => 'currency', 'originCurrency' => 'origin_currency', 'originRegion' => 'origin_region', 'originTimeZone' => 'origin_timezone'];
        $trip->update(array_combine(array_map(fn ($key) => $map[$key], array_keys($data)), array_values($data)));
        return response()->json($this->serializeTrip($trip->fresh('users')));
    }

    public function destroy(Trip $trip): JsonResponse
    {
        $trip->delete();
        return response()->json(['ok' => true]);
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