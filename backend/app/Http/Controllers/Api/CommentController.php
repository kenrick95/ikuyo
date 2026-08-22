<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Trip;
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
        ]);

        $comment = DB::transaction(function () use ($data, $trip, $user): Comment {
            $groupId = $data['groupId'] ?? (string) Str::uuid();
            $group = CommentGroup::firstOrCreate(
                ['id' => $groupId],
                ['trip_id' => $trip->id, 'status' => 0],
            );
            if (empty($data['groupId'])) {
                CommentGroupObject::create([
                    'id' => $groupId,
                    'comment_group_id' => $groupId,
                    'object_type' => $data['objectType'],
                    'object_id' => $data['objectId'],
                ]);
            }
            return $group->comments()->create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'content' => $data['content'],
            ]);
        });

        return response()->json($comment->load('user'), 201);
    }

    public function updateStatusById(Request $request, string $group): JsonResponse
    {
        $record = CommentGroup::with('trip')->findOrFail($group);
        abort_unless($request->user() && app(\App\Services\TripAccessService::class)->canEdit($record->trip, $request->user()), 403);
        $record->update($request->validate(['status' => ['required', 'integer', 'in:0,1']]));
        return response()->json($record);
    }

    public function updateById(Request $request, string $comment): JsonResponse
    {
        $record = Comment::with('commentGroup.trip')->findOrFail($comment);
        abort_unless($request->user() && app(\App\Services\TripAccessService::class)->canEdit($record->commentGroup->trip, $request->user()), 403);
        abort_unless($record->user_id === $request->user()->id || app(\App\Services\TripAccessService::class)->canManage($record->commentGroup->trip, $request->user()), 403);
        $record->update($request->validate(['content' => ['required', 'string']]));
        return response()->json($record->fresh('user'));
    }

    public function destroyById(Request $request, string $comment): JsonResponse
    {
        $record = Comment::with('commentGroup.trip')->findOrFail($comment);
        abort_unless($request->user() && app(\App\Services\TripAccessService::class)->canEdit($record->commentGroup->trip, $request->user()), 403);
        abort_unless($record->user_id === $request->user()->id || app(\App\Services\TripAccessService::class)->canManage($record->commentGroup->trip, $request->user()), 403);
        $record->delete();
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
            if (!$commentGroup->comments()->exists()) {
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