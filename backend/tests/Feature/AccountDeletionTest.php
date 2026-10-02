<?php

namespace Tests\Feature;

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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create(['id' => (string) Str::uuid(), 'handle' => Str::random(12), 'activated' => true]);
    }

    private function trip(User $owner): Trip
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'JP',
            'currency' => 'JPY', 'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100, 'timestamp_end_ms' => 200, 'sharing_level' => 0,
        ]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        return $trip;
    }

    public function test_deletion_requires_authentication_and_explicit_confirmation(): void
    {
        $this->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertUnauthorized();
        $user = $this->user();
        $this->actingAs($user)->deleteJson('/api/users/me')->assertUnprocessable();
        $this->deleteJson('/api/users/me', ['confirmation' => 'wrong'])->assertUnprocessable();
        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_account_deletion_retains_rows_and_cascades_only_owned_trips(): void
    {
        $user = $this->user();
        $other = $this->user();
        $trip = $this->trip($user);
        $archived = $this->trip($user);
        $archived->update(['archived_at_ms' => 123]);
        $previouslyDeleted = $this->trip($user);
        $previouslyDeleted->delete();
        $shared = $this->trip($other);
        $shared->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 1, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $trip->users()->attach($other->id, ['id' => (string) Str::uuid(), 'role' => 1, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $records = [
            Activity::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'Activity', 'location' => 'Tokyo']),
            Accommodation::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'name' => 'Hotel', 'check_in_ms' => 100, 'check_out_ms' => 200]),
            MacroPlan::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'name' => 'Plan', 'timestamp_start_ms' => 100, 'timestamp_end_ms' => 200]),
            Expense::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'Expense', 'amount' => 10, 'currency' => 'JPY', 'incurred_at_ms' => 100]),
        ];
        $list = TaskList::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'title' => 'List', 'index' => 0, 'status' => 0]);
        $records[] = Task::create(['id' => Str::uuid(), 'task_list_id' => $list->id, 'title' => 'Task', 'index' => 0, 'status' => 0]);
        $records[] = $list;
        $group = CommentGroup::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'status' => 0]);
        $records[] = CommentGroupObject::create(['id' => Str::uuid(), 'comment_group_id' => $group->id, 'object_type' => 0, 'object_id' => $trip->id]);
        $records[] = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $group->id, 'user_id' => $other->id, 'content' => 'Comment']);
        $records[] = $group;
        $remaining = Activity::create(['id' => Str::uuid(), 'trip_id' => $shared->id, 'title' => 'Keep', 'location' => 'Tokyo']);
        $oldChild = Activity::create(['id' => Str::uuid(), 'trip_id' => $previouslyDeleted->id, 'title' => 'Old', 'location' => 'Tokyo']);
        $records[] = $oldChild;
        $sharedGroup = CommentGroup::create(['id' => Str::uuid(), 'trip_id' => $shared->id, 'status' => 0]);
        $ownComment = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $sharedGroup->id, 'user_id' => $user->id, 'content' => 'Mine']);
        $otherComment = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $sharedGroup->id, 'user_id' => $other->id, 'content' => 'Keep']);
        $records[] = $ownComment;
        DB::table('sessions')->insert(['id' => 'other-session', 'user_id' => $user->id, 'payload' => '', 'last_activity' => 1]);

        $this->actingAs($user)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertOk();
        $this->assertGuest();
        foreach ([$user, $trip, $archived, $previouslyDeleted, ...$records] as $record) {
            $this->assertSoftDeleted($record->getTable(), ['id' => (string) $record->id]);
        }
        foreach ([$other, $shared, $remaining, $sharedGroup, $otherComment] as $record) {
            $this->assertNotSoftDeleted($record->getTable(), ['id' => (string) $record->id]);
        }
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseHas('sync_events', ['entity' => 'trips', 'entity_id' => $trip->id, 'operation' => 'delete']);
    }
}
