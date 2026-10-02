<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AccountDeletionService
{
    public function delete(User $user): void
    {
        DB::transaction(function () use ($user): void {
            $target = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            // Membership alone does not confer ownership of somebody else's data.
            $trips = Trip::withTrashed()->whereIn('id', DB::table('trip_user')
                ->where('user_id', $target->id)->where('role', 0)->select('trip_id'))
                ->orderBy('id')->lockForUpdate()->get();

            foreach ($trips as $trip) {
                $lists = TaskList::withTrashed()->withoutGlobalScope('activeTrip')
                    ->where('trip_id', $trip->id)->select('id');
                $groups = CommentGroup::withTrashed()->withoutGlobalScope('activeTrip')
                    ->where('trip_id', $trip->id)->select('id');
                // Children go first so their sync events retain their trip IDs.
                foreach (Task::withoutGlobalScope('activeParent')->whereIn('task_list_id', $lists)->get() as $task) {
                    $task->delete();
                }
                foreach (Comment::withoutGlobalScope('activeParent')->whereIn('comment_group_id', $groups)->get() as $comment) {
                    $comment->delete();
                }
                foreach (CommentGroupObject::withoutGlobalScope('activeParent')->whereIn('comment_group_id', $groups)->get() as $object) {
                    $object->delete();
                }
                foreach ([Activity::class, Accommodation::class, MacroPlan::class, Expense::class, TaskList::class, CommentGroup::class] as $model) {
                    foreach ($model::withoutGlobalScope('activeTrip')->where('trip_id', $trip->id)->get() as $record) {
                        $record->delete();
                    }
                }
                if (! $trip->trashed()) {
                    $trip->delete();
                }
            }

            // Comments are the only content with individual authorship outside
            // owned trips. Preserve other members' comments in the same thread.
            foreach (Comment::withoutGlobalScope('activeParent')->where('user_id', $target->id)->get() as $comment) {
                $comment->delete();
            }
            $target->forceFill(['reset_token' => null, 'reset_token_at' => null])->save();
            $target->delete();
            DB::table((string) config('session.table', 'sessions'))->where('user_id', $target->id)->delete();
        });
    }
}
