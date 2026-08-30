<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\CommentGroup;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\Trip;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TripController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $now = (int) $request->integer('now', (int) round(microtime(true) * 1000));
        // Membership is resolved from the authenticated principal only; never
        // trust a client-supplied `user_id`, which would allow enumerating
        // another user's trips.
        $user = $request->user();
        $userId = $user?->getKey();

        if (! $userId) {
            return response()->json(['message' => 'Authentication required.'], 401);
        }

        $query = Trip::query()
            ->select(['trips.*'])
            ->join('trip_user', 'trip_user.trip_id', '=', 'trips.id')
            ->where('trip_user.user_id', $userId)
            ->distinct();

        $status = $request->query('status');
        if ($status === 'archived') {
            $query->whereNotNull('archived_at_ms');
        } else {
            $query->whereNull('archived_at_ms');
        }

        if ($status === 'active') {
            $query->where('timestamp_end_ms', '>=', $now);
        } elseif ($status === 'past') {
            $query->where('timestamp_end_ms', '<', $now);
        }

        if ($status === 'archived') {
            $query->orderByDesc('archived_at_ms')->orderBy('trips.id');
        } else {
            $query->orderBy('timestamp_end_ms', 'desc')->orderBy('trips.id'); // deterministic tiebreak for equal timestamp_end_ms
        }

        $trips = $query->cursorPaginate(min($request->integer('limit', 50), 100));

        return response()->json([
            'data' => collect($trips->items())->map(fn (Trip $trip): array => [
                'id' => $trip->id,
                'title' => $trip->title,
                'timestampStart' => $trip->timestamp_start_ms,
                'timestampEnd' => $trip->timestamp_end_ms,
                'timeZone' => $trip->timezone,
                'archivedAt' => $trip->archived_at_ms,
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
            ->orderBy('id') // deterministic tiebreak for equal created_at_ms
            ->cursorPaginate($limit);

        $trips->getCollection()->transform(fn (Trip $trip): array => [
            'id' => $trip->id,
            'title' => $trip->title,
            'timestampStart' => $trip->timestamp_start_ms,
            'timestampEnd' => $trip->timestamp_end_ms,
            'timeZone' => $trip->timezone,
            'archivedAt' => $trip->archived_at_ms,
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

    public function sharing(Request $request, Trip $trip): JsonResponse
    {
        $trip->update(['sharing_level' => $request->validate(['sharingLevel' => ['required', 'integer', 'in:0,2,3']])['sharingLevel']]);

        return response()->json($this->serializeTrip($trip->fresh()));
    }

    public function archive(Request $request, Trip $trip): JsonResponse
    {
        $archived = $request->validate(['archived' => ['required', 'boolean']])['archived'];
        $trip->update(['archived_at_ms' => $archived ? ($trip->archived_at_ms ?? $this->nowMs()) : null]);

        return response()->json($this->serializeTrip($trip->fresh('users')));
    }

    public function sections(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate([
            'publicShowExpenses' => ['sometimes', 'nullable', 'boolean'],
            'publicShowTasks' => ['sometimes', 'nullable', 'boolean'],
            'publicShowComments' => ['sometimes', 'nullable', 'boolean'],
            'viewerShowExpenses' => ['sometimes', 'nullable', 'boolean'],
            'viewerShowTasks' => ['sometimes', 'nullable', 'boolean'],
            'viewerShowComments' => ['sometimes', 'nullable', 'boolean'],
        ]);
        $map = ['publicShowExpenses' => 'public_show_expenses', 'publicShowTasks' => 'public_show_tasks', 'publicShowComments' => 'public_show_comments', 'viewerShowExpenses' => 'viewer_show_expenses', 'viewerShowTasks' => 'viewer_show_tasks', 'viewerShowComments' => 'viewer_show_comments'];
        $trip->update(array_combine(array_map(fn ($key) => $map[$key], array_keys($data)), array_values($data)));

        return response()->json($this->serializeTrip($trip->fresh()));
    }

    public function duplicate(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'startDateMs' => ['required', 'integer'],
            'endDateMs' => ['required', 'integer'],
            'includeActivities' => ['boolean'], 'includeAccommodations' => ['boolean'],
            'includeMacroplans' => ['boolean'], 'includeExpenses' => ['boolean'],
            'includeTasks' => ['boolean'], 'removeActivityDates' => ['boolean'],
        ]);
        $user = $request->user();
        abort_unless($user, 401);
        $now = $this->nowMs();
        $trip->load(['activities', 'accommodations', 'macroPlans', 'expenses', 'taskLists.tasks']);
        $newTrip = DB::transaction(function () use ($trip, $data, $user, $now): Trip {
            $copy = Trip::create([
                'id' => (string) Str::uuid(), 'title' => $data['title'],
                'timestamp_start_ms' => $data['startDateMs'], 'timestamp_end_ms' => $data['endDateMs'],
                'timezone' => $trip->timezone, 'region' => $trip->region, 'currency' => $trip->currency,
                'origin_currency' => $trip->origin_currency, 'origin_region' => $trip->origin_region,
                'origin_timezone' => $trip->origin_timezone, 'sharing_level' => 0,
            ]);
            $copy->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => $now, 'updated_at_ms' => $now]);
            if ($data['includeActivities'] ?? false) {
                foreach ($trip->activities as $item) {
                    $copy->activities()->create($this->copyActivity($item, $data['removeActivityDates'] ?? false, $trip, $data['startDateMs']));
                }
            }
            if ($data['includeAccommodations'] ?? false) {
                foreach ($trip->accommodations as $item) {
                    $copy->accommodations()->create($this->copyAccommodation($item, $trip, $data['startDateMs']));
                }
            }
            if ($data['includeMacroplans'] ?? false) {
                foreach ($trip->macroPlans as $item) {
                    $copy->macroPlans()->create($this->copyMacroPlan($item, $trip, $data['startDateMs']));
                }
            }
            if ($data['includeExpenses'] ?? false) {
                foreach ($trip->expenses as $item) {
                    $copy->expenses()->create($item->only(['amount', 'amount_in_origin_currency', 'currency', 'currency_conversion_factor', 'title', 'description', 'incurred_at_ms', 'timezone_incurred']));
                }
            }
            if ($data['includeTasks'] ?? false) {
                foreach ($trip->taskLists as $list) {
                    $copyList = $copy->taskLists()->create(['title' => $list->title, 'index' => $list->index, 'status' => $list->status]);
                    foreach ($list->tasks as $item) {
                        $copyList->tasks()->create(['title' => $item->title, 'description' => $item->description, 'index' => $item->index, 'status' => 0, 'due_at_ms' => $item->due_at_ms, 'completed_at_ms' => null]);
                    }
                }
            }

            return $copy;
        });

        return response()->json(['id' => $newTrip->id], 201);
    }

    public function show(Request $request, Trip $trip, TripAccessService $access): JsonResponse
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

        $role = $access->role($trip, $request->user());
        abort_unless($access->canView($trip, $request->user()), $request->user() ? 403 : 401);

        return response()->json($this->serializeTrip($trip, $role));
    }

    private function nowMs(): int
    {
        return (int) round(microtime(true) * 1000);
    }

    private function copyActivity(Activity $item, bool $removeDates, Trip $trip, int $newStartMs): array
    {
        $row = $item->only(['title', 'location', 'location_lat', 'location_lng', 'location_zoom', 'location_destination', 'location_destination_lat', 'location_destination_lng', 'location_destination_zoom', 'description', 'timezone_start', 'timezone_end', 'flags', 'icon']);
        $row['timestamp_start_ms'] = $removeDates || $item->timestamp_start_ms === null ? null : $this->shiftCalendarDays((int) $item->timestamp_start_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->timezone_start ?? $trip->timezone));
        $row['timestamp_end_ms'] = $removeDates || $item->timestamp_end_ms === null ? null : $this->shiftCalendarDays((int) $item->timestamp_end_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->timezone_end ?? $trip->timezone));

        return $row;
    }

    private function copyAccommodation(Accommodation $item, Trip $trip, int $newStartMs): array
    {
        $row = $item->only(['name', 'address', 'phone_number', 'notes', 'tz_check_in', 'tz_check_out', 'location_lat', 'location_lng', 'location_zoom']);
        $row['check_in_ms'] = $this->shiftCalendarDays((int) $item->check_in_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->tz_check_in ?? $trip->timezone));
        $row['check_out_ms'] = $this->shiftCalendarDays((int) $item->check_out_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->tz_check_out ?? $trip->timezone));

        return $row;
    }

    private function copyMacroPlan(MacroPlan $item, Trip $trip, int $newStartMs): array
    {
        $row = $item->only(['name', 'notes', 'timezone_start', 'timezone_end']);
        $row['timestamp_start_ms'] = $this->shiftCalendarDays((int) $item->timestamp_start_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->timezone_start ?? $trip->timezone));
        $row['timestamp_end_ms'] = $this->shiftCalendarDays((int) $item->timestamp_end_ms, (int) $trip->timestamp_start_ms, $newStartMs, (string) ($item->timezone_end ?? $trip->timezone));

        return $row;
    }

    /** Move a timestamp by the calendar-day difference between two trip starts, in the target timezone (DST-safe). */
    private function shiftCalendarDays(int $timestampMs, int $fromStartMs, int $toStartMs, string $tz): int
    {
        $fromStart = Carbon::createFromTimestampMs($fromStartMs, $tz)->startOfDay();
        $toStart = Carbon::createFromTimestampMs($toStartMs, $tz)->startOfDay();
        // Signed source→destination day difference: negative when duplicating to
        // an earlier start date (so content shifts backward, not forward).
        $days = $fromStart->diffInDays($toStart, false);

        return Carbon::createFromTimestampMs($timestampMs, $tz)->addDays($days)->getTimestampMs();
    }

    private function serializeTrip(Trip $trip, ?int $role = null): array
    {
        $isPublicVisitor = $role === null && $trip->sharing_level >= 2;
        $isMemberOrOwner = $role !== null;
        $showExpenses = $isPublicVisitor ? $trip->public_show_expenses !== false : ($role !== 2 || $trip->viewer_show_expenses !== false);
        $showTasks = $isPublicVisitor ? $trip->public_show_tasks !== false : ($role !== 2 || $trip->viewer_show_tasks !== false);
        $showComments = $isPublicVisitor ? $trip->public_show_comments !== false : ($role !== 2 || $trip->viewer_show_comments !== false);

        return [
            'id' => $trip->id,
            'title' => $trip->title,
            'timestampStart' => $trip->timestamp_start_ms,
            'timestampEnd' => $trip->timestamp_end_ms,
            'timeZone' => $trip->timezone,
            'region' => $trip->region,
            'currency' => $trip->currency,
            'originCurrency' => $trip->origin_currency,
            'originRegion' => $trip->origin_region,
            'originTimeZone' => $trip->origin_timezone,
            'archivedAt' => $trip->archived_at_ms,
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
            'expense' => $showExpenses ? $trip->expenses : [],
            'taskList' => $showTasks ? $trip->taskLists->map(fn ($list): array => array_merge($list->toArray(), ['task' => $list->tasks->values()]))->values() : [],
            'tripUser' => $trip->users->map(function ($user) use ($isMemberOrOwner): array {
                $userArr = ['id' => $user->id, 'handle' => $user->handle, 'activated' => (bool) $user->activated];
                // Email is only exposed to authenticated members, matching instant.perms.ts.
                if ($isMemberOrOwner) {
                    $userArr['email'] = $user->email;
                }

                return ['id' => $user->pivot?->id, 'role' => $user->pivot?->role, 'user' => $userArr];
            })->values(),
            'commentGroup' => $showComments ? $trip->commentGroups->map(fn ($group): array => $this->serializeCommentGroup($group))->values() : [],
        ];
    }

    private function serializeCommentGroup(CommentGroup $group): array
    {
        $comments = ($group->comments ?? collect())->map(function ($comment): array {
            $commentUser = $comment->user;

            return [
                'id' => $comment->id,
                'content' => $comment->content,
                'createdAt' => $comment->created_at_ms,
                'lastUpdatedAt' => $comment->updated_at_ms,
                'user' => [
                    'id' => $commentUser?->id,
                    'handle' => $commentUser?->handle,
                    'activated' => (bool) ($commentUser?->activated ?? false),
                ],
            ];
        })->values();

        $object = null;
        if ($group->object) {
            $type = $this->objectTypeName((int) $group->object->object_type);
            $objectArr = [
                'id' => $group->object->id,
                'type' => $type,
                'createdAt' => $group->object->created_at_ms,
                'lastUpdatedAt' => $group->object->updated_at_ms,
            ];
            $target = $this->resolveCommentTarget((int) $group->object->object_type, $group->object->object_id);
            $objectArr[$type] = $target ? [$target] : [];
            $object = $objectArr;
        }

        return [
            'id' => $group->id,
            'status' => $group->status,
            'createdAt' => $group->created_at_ms,
            'lastUpdatedAt' => $group->updated_at_ms,
            'comment' => $comments,
            'object' => $object,
        ];
    }

    private function resolveCommentTarget(int $type, ?string $objectId): ?array
    {
        if ($objectId === null) {
            return null;
        }
        $model = match ($type) {
            0 => Trip::class,
            1 => Activity::class,
            2 => Accommodation::class,
            3 => MacroPlan::class,
            4 => Expense::class,
            5 => Task::class,
            default => null,
        };
        if (! $model) {
            return null;
        }
        $record = $model::whereKey($objectId)->first();
        if (! $record) {
            return ['id' => $objectId];
        }
        // Use getAttribute so Eloquent dynamic attributes (e.g. a `name` column on
        // accommodations/macroplans) are resolved, falling back to `title`.
        $name = $record->getAttribute('name') ?: $record->getAttribute('title');

        return ['id' => $record->id, 'title' => $name];
    }

    private function objectTypeName(int $type): string
    {
        return ['trip', 'activity', 'accommodation', 'macroplan', 'expense', 'task'][$type] ?? 'trip';
    }
}
