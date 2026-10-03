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
            // Lock administrators in a stable order before the target user so
            // simultaneous self-deletions cannot both remove the last admin.
            $admins = User::where('role', 'admin')->orderBy('id')->lockForUpdate()->get(['id']);
            $target = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_if($target->isAdmin() && $admins->count() <= 1, 409, 'The last administrator cannot delete their account. Assign another administrator first.');
            // Membership alone does not confer ownership of somebody else's data.
            $ownedTrips = DB::table('trip_user')->where('user_id', $target->id)->where('role', 0)->select('trip_id');
            $commentTrips = DB::table('comments')->join('comment_groups', 'comments.comment_group_id', '=', 'comment_groups.id')
                ->where('comments.user_id', $target->id)->whereNull('comments.deleted_at')->select('comment_groups.trip_id');
            $trips = Trip::withTrashed()->where(fn ($query) => $query->whereIn('id', $ownedTrips)->orWhereIn('id', $commentTrips))
                ->orderBy('id')->lockForUpdate()->get();
            $ownedIds = $ownedTrips->pluck('trip_id');

            foreach ($trips as $trip) {
                if (! $ownedIds->contains($trip->id)) {
                    continue;
                }
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
        }, 3);
    }
}
