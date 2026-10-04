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

    public function test_last_active_administrator_cannot_delete_their_account(): void
    {
        $admin = $this->user();
        $admin->update(['role' => 'admin']);
        $deletedAdmin = $this->user();
        $deletedAdmin->update(['role' => 'admin']);
        $deletedAdmin->delete();
        $trip = $this->trip($admin);

        $this->actingAs($admin)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])
            ->assertStatus(409)->assertJsonPath('message', 'The last administrator cannot delete their account. Assign another administrator first.');
        $this->assertAuthenticatedAs($admin);
        $this->assertNotSoftDeleted('users', ['id' => $admin->id]);
        $this->assertNotSoftDeleted('trips', ['id' => $trip->id]);
    }

    public function test_an_administrator_can_delete_only_while_another_active_admin_remains(): void
    {
        $first = $this->user();
        $first->update(['role' => 'admin']);
        $last = $this->user();
        $last->update(['role' => 'admin']);

        $this->actingAs($first)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertOk();
        $this->assertSoftDeleted('users', ['id' => $first->id]);
        $this->actingAs($last)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertStatus(409);
        $this->assertNotSoftDeleted('users', ['id' => $last->id]);
    }

    public function test_empty_shared_threads_are_deleted_and_restore_only_the_comments_removed_with_them(): void
    {
        $user = $this->user();
        $other = $this->user();
        $other->update(['role' => 'admin']);
        $trip = $this->trip($other);
        $group = CommentGroup::create(['id' => Str::uuid(), 'trip_id' => $trip->id, 'status' => 0]);
        $object = CommentGroupObject::create(['id' => Str::uuid(), 'comment_group_id' => $group->id, 'object_type' => 0, 'object_id' => $trip->id]);
        $oldComment = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $group->id, 'user_id' => $other->id, 'content' => 'Previously removed']);
        $oldComment->delete();
        $comments = [];
        foreach (['First', 'Second'] as $content) {
            $comments[] = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $group->id, 'user_id' => $user->id, 'content' => $content]);
        }

        $this->actingAs($user)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertOk();
        $this->assertNotSoftDeleted('trips', ['id' => $trip->id]);
        $this->assertSoftDeleted('comment_groups', ['id' => (string) $group->id]);
        $this->assertSoftDeleted('comment_group_objects', ['id' => (string) $object->id]);
        foreach ($comments as $comment) {
            $this->assertDatabaseHas('comments', ['id' => (string) $comment->id, 'deleted_with_group' => true]);
        }
        $this->assertDatabaseHas('sync_events', ['entity' => 'comment_groups', 'entity_id' => (string) $group->id, 'operation' => 'delete', 'trip_id' => $trip->id]);
        $this->assertDatabaseHas('sync_events', ['entity' => 'comment_group_objects', 'entity_id' => (string) $object->id, 'operation' => 'delete', 'trip_id' => $trip->id]);

        $this->actingAs($other)->postJson('/api/admin/trips/' . $trip->id . '/content/comment-groups/' . $group->id . '/restore')->assertOk();
        $this->assertNotSoftDeleted('comment_groups', ['id' => (string) $group->id]);
        $this->assertNotSoftDeleted('comment_group_objects', ['id' => (string) $object->id]);
        foreach ($comments as $comment) {
            $this->assertNotSoftDeleted('comments', ['id' => (string) $comment->id]);
        }
        $this->assertSoftDeleted('comments', ['id' => (string) $oldComment->id]);
        // Restoring the thread must safely serialize its deleted author.
        $this->getJson('/api/trips/' . $trip->id)->assertOk()
            ->assertJsonFragment(['id' => $user->id, 'handle' => '[deleted]', 'activated' => false]);
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
        $oldList = TaskList::create(['id' => Str::uuid(), 'trip_id' => $previouslyDeleted->id, 'title' => 'Old list', 'index' => 0, 'status' => 0]);
        $oldTask = Task::create(['id' => Str::uuid(), 'task_list_id' => $oldList->id, 'title' => 'Old task', 'index' => 0, 'status' => 0]);
        $oldGroup = CommentGroup::create(['id' => Str::uuid(), 'trip_id' => $previouslyDeleted->id, 'status' => 0]);
        $oldComment = Comment::create(['id' => Str::uuid(), 'comment_group_id' => $oldGroup->id, 'user_id' => $user->id, 'content' => 'Old comment']);
        $oldObject = CommentGroupObject::create(['id' => Str::uuid(), 'comment_group_id' => $oldGroup->id, 'object_type' => 0, 'object_id' => $previouslyDeleted->id]);
        array_push($records, $oldList, $oldTask, $oldGroup, $oldComment, $oldObject);
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
        foreach (['tasks' => $oldTask, 'comments' => $oldComment, 'comment_group_objects' => $oldObject] as $entity => $record) {
            $this->assertDatabaseHas('sync_events', ['entity' => $entity, 'entity_id' => (string) $record->id, 'operation' => 'delete', 'trip_id' => $previouslyDeleted->id]);
        }
    }
}
