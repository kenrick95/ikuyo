<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\Trip;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommentController extends Controller
{
    public function store(Request $request, Trip $trip): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        $data = $request->validate([
            'content' => ['required', 'string'],
            'objectType' => ['required', 'integer', 'between:0,5'],
            'objectId' => ['required', 'string', 'max:40'],
            'groupId' => ['nullable', 'string', 'max:40'],
            // Optional client-supplied comment id (optimistic insert); falls back server-side.
            'id' => ['nullable', 'string', 'max:40'],
        ]);

        $comment = DB::transaction(function () use ($data, $trip, $user): Comment {
            $groupId = $data['groupId'] ?? (string) Str::uuid();
            $group = null;
            if (! empty($data['groupId'])) {
                // Reject cross-trip group IDs: an editor of one trip must not append
                // to another trip's group by guessing its id. If the id is unknown to
                // this trip it is treated as a *client-supplied* new group id (the
                // optimistic create path) rather than an error.
                $group = $trip->commentGroups()->whereKey($groupId)->first();
                if ($group === null) {
                    abort_unless($this->objectBelongsToTrip((int) $data['objectType'], $data['objectId'], $trip), 422);
                    $group = CommentGroup::create(['id' => $groupId, 'trip_id' => $trip->id, 'status' => 0]);
                    CommentGroupObject::create(['id' => $groupId, 'comment_group_id' => $groupId, 'object_type' => $data['objectType'], 'object_id' => $data['objectId']]);
                }
            } else {
                // Reject comment targets that belong to another trip.
                abort_unless($this->objectBelongsToTrip((int) $data['objectType'], $data['objectId'], $trip), 422);
                $group = CommentGroup::create(['id' => $groupId, 'trip_id' => $trip->id, 'status' => 0]);
                CommentGroupObject::create(['id' => $groupId, 'comment_group_id' => $groupId, 'object_type' => $data['objectType'], 'object_id' => $data['objectId']]);
            }

            return $group->comments()->create([
                'id' => $data['id'] ?? (string) Str::uuid(),
                'user_id' => $user->id,
                'content' => $data['content'],
            ]);
        });

        return response()->json($comment->load('user'), 201);
    }

    /** Verify a polymorphic comment target (0..5) belongs to this trip. */
    private function objectBelongsToTrip(int $type, string $objectId, Trip $trip): bool
    {
        if ($type === 0) {
            return $objectId === $trip->id;
        }
        if ($type === 5) {
            return Task::whereKey($objectId)
                ->whereHas('taskList', fn ($q) => $q->where('trip_id', $trip->id))->exists();
        }
        $model = match ($type) {
            1 => Activity::class,
            2 => Accommodation::class,
            3 => MacroPlan::class,
            4 => Expense::class,
            default => null,
        };

        return $model && $model::whereKey($objectId)->where('trip_id', $trip->id)->exists();
    }

    public function updateStatusById(Request $request, string $group): JsonResponse
    {
        $record = CommentGroup::with('trip')->findOrFail($group);
        abort_unless($request->user() && app(TripAccessService::class)->canEdit($record->trip, $request->user()), 403);
        $record->update($request->validate(['status' => ['required', 'integer', 'in:0,1']]));

        return response()->json($record);
    }

    public function updateById(Request $request, string $comment): JsonResponse
    {
        $record = Comment::with('commentGroup.trip')->findOrFail($comment);
        abort_unless($request->user() && app(TripAccessService::class)->canEdit($record->commentGroup->trip, $request->user()), 403);
        abort_unless($record->user_id === $request->user()->id || app(TripAccessService::class)->canManage($record->commentGroup->trip, $request->user()), 403);
        $record->update($request->validate(['content' => ['required', 'string']]));

        return response()->json($record->fresh('user'));
    }

    public function destroyById(Request $request, string $comment): JsonResponse
    {
        $record = Comment::with('commentGroup.trip')->findOrFail($comment);
        abort_unless($request->user() && app(TripAccessService::class)->canEdit($record->commentGroup->trip, $request->user()), 403);
        abort_unless($record->user_id === $request->user()->id || app(TripAccessService::class)->canManage($record->commentGroup->trip, $request->user()), 403);
        DB::transaction(function () use ($record): void {
            $group = $record->commentGroup;
            $record->delete();
            if ($group && ! $group->comments()->exists()) {
                $group->object()->delete();
                $group->delete();
            }
        });

        return response()->json(['ok' => true]);
    }

    public function updateStatus(Request $request, Trip $trip, string $group): JsonResponse
    {
        $record = $trip->commentGroups()->whereKey($group)->firstOrFail();
        $record->update($request->validate(['status' => ['required', 'integer', 'in:0,1']]));

        return response()->json($record);
    }

    public function update(Request $request, Trip $trip, string $group, string $comment): JsonResponse
    {
        $record = $trip->commentGroups()->whereKey($group)->firstOrFail()->comments()->whereKey($comment)->firstOrFail();
        abort_unless($record->user_id === $request->user()->id || $this->isOwner($trip, $request), 403);
        $record->update($request->validate(['content' => ['required', 'string']]));

        return response()->json($record->fresh('user'));
    }

    public function destroy(Request $request, Trip $trip, string $group, string $comment): JsonResponse
    {
        $commentGroup = $trip->commentGroups()->whereKey($group)->firstOrFail();
        $record = $commentGroup->comments()->whereKey($comment)->firstOrFail();
        abort_unless($record->user_id === $request->user()->id || $this->isOwner($trip, $request), 403);
        DB::transaction(function () use ($record, $commentGroup): void {
            $record->delete();
            if (! $commentGroup->comments()->exists()) {
                $commentGroup->object()->delete();
                $commentGroup->delete();
            }
        });

        return response()->json(['ok' => true]);
    }

    private function isOwner(Trip $trip, Request $request): bool
    {
        return $trip->users()->whereKey($request->user()->id)->wherePivot('role', 0)->exists();
    }
}
