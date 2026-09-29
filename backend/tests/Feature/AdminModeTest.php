<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\SyncEvent;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class AdminModeTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'user'): User
    {
        return User::create([
            'id' => (string) Str::uuid(),
            'handle' => 'user_' . Str::lower(Str::random(8)),
            'email' => Str::lower(Str::random(8)) . '@example.com',
            'role' => $role,
            'activated' => true,
        ]);
    }

    private function trip(User $owner): Trip
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(),
            'title' => 'Private debug trip',
            'region' => 'JP',
            'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100,
            'timestamp_end_ms' => 200,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($owner->id, [
            'id' => (string) Str::uuid(),
            'role' => 0,
            'created_at_ms' => 1,
            'updated_at_ms' => 1,
        ]);

        return $trip;
    }

    public function test_only_admin_can_search_users_and_view_private_trips(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $other = $this->user();
        $trip = $this->trip($owner);
        $trip->update(['viewer_show_tasks' => false]);
        $trip->users()->attach($admin->id, [
            'id' => (string) Str::uuid(), 'role' => 2,
            'created_at_ms' => 1, 'updated_at_ms' => 1,
        ]);
        TaskList::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id,
            'title' => 'Hidden from viewers', 'index' => 0, 'status' => 0,
        ]);

        $this->actingAs($other)->getJson('/api/admin/users')->assertForbidden();
        $this->actingAs($other)->getJson('/api/admin/users/' . $owner->id . '/trips')->assertForbidden();
        $this->actingAs($other)->deleteJson('/api/admin/trips/' . $trip->id)->assertForbidden();
        $this->actingAs($other)->getJson('/api/trips/' . $trip->id)->assertForbidden();

        $this->actingAs($admin)->getJson('/api/admin/users?search=' . $owner->handle)
            ->assertOk()->assertJsonFragment(['id' => $owner->id]);
        $this->actingAs($admin)->getJson('/api/auth/me')
            ->assertOk()->assertJsonPath('user.role', 'admin');
        $this->actingAs($admin)->getJson('/api/admin/users/' . $owner->id . '/trips')
            ->assertOk()->assertJsonPath('data.0.id', $trip->id);
        $this->actingAs($admin)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('adminAccess', true)
            ->assertJsonPath('title', $trip->title)
            ->assertJsonCount(1, 'taskList');
        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id, ['title' => 'Updated for debugging'])
            ->assertOk()->assertJsonPath('title', 'Updated for debugging');
    }

    public function test_admin_can_edit_and_soft_delete_then_restore_another_users_content(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $activity = Activity::create([
            'id' => (string) Str::uuid(),
            'trip_id' => $trip->id,
            'title' => 'Debug activity',
            'location' => '',
            'description' => '',
        ]);

        $this->actingAs($admin)->putJson('/api/activities/' . $activity->id, [
            'title' => 'Fixed activity',
        ])->assertOk();
        $this->actingAs($admin)->deleteJson('/api/admin/trips/' . $trip->id . '/content/activities/' . $activity->id)
            ->assertOk();
        $this->assertSoftDeleted('activities', ['id' => $activity->id]);
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonCount(0, 'activity');
        $this->actingAs($admin)->getJson('/api/admin/trips/' . $trip->id . '/content')
            ->assertOk()->assertJsonFragment(['id' => $activity->id, 'entity' => 'activities']);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/activities/' . $activity->id . '/restore')
            ->assertOk();
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('activity.0.title', 'Fixed activity');
    }

    public function test_deleted_trip_is_hidden_until_admin_restores_it(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);

        $this->actingAs($admin)->deleteJson('/api/admin/trips/' . $trip->id)->assertOk();
        $this->assertSoftDeleted('trips', ['id' => $trip->id]);
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertNotFound();
        $this->actingAs($admin)->getJson('/api/admin/users/' . $owner->id . '/trips')
            ->assertOk()->assertJsonPath('data.0.id', $trip->id);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/restore')->assertOk();
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertOk();
    }

    public function test_profile_cannot_grant_admin_role(): void
    {
        $user = $this->user();

        $this->actingAs($user)->patchJson('/api/users/me', ['role' => 'admin'])->assertOk();
        $this->assertSame('user', $user->fresh()->role);
    }

    public function test_admin_can_soft_delete_and_restore_an_account_without_losing_its_trips(): void
    {
        $admin = $this->user('admin');
        $owner = $this->user();
        $owner->update([
            'password_hash' => Hash::make('test-password'),
            'reset_token' => hash('sha256', 'reset-link'),
            'reset_token_at' => now()->addHour()->getTimestampMs(),
        ]);
        $trip = $this->trip($owner);
        DB::table('sessions')->insert([
            'id' => 'deleted-user-session',
            'user_id' => $owner->id,
            'payload' => '',
            'last_activity' => time(),
        ]);

        $this->actingAs($owner)->deleteJson('/api/admin/users/' . $admin->id)->assertForbidden();
        $this->actingAs($admin)->deleteJson('/api/admin/users/' . $admin->id)->assertForbidden();
        $this->actingAs($admin)->deleteJson('/api/admin/users/' . $owner->id)->assertOk();
        $this->assertSoftDeleted('users', ['id' => $owner->id]);
        $this->assertDatabaseHas('admin_audit_events', [
            'actor_user_id' => $admin->id, 'target_type' => 'user',
            'target_id' => $owner->id, 'action' => 'delete',
        ]);
        $this->assertNull(User::find($owner->id));
        $this->assertDatabaseMissing('sessions', ['id' => 'deleted-user-session']);
        $this->assertNull(User::withTrashed()->findOrFail($owner->id)->reset_token);
        $this->getJson('/api/admin/users?search=' . $owner->handle)
            ->assertOk()->assertJsonPath('0.id', $owner->id)->assertJsonPath('0.deletedAt', User::withTrashed()->findOrFail($owner->id)->getRawOriginal('deleted_at'));
        $this->getJson('/api/admin/users/' . $owner->id . '/trips')
            ->assertOk()->assertJsonPath('data.0.id', $trip->id);
        $this->postJson('/api/auth/login', ['email' => $owner->email, 'password' => 'test-password'])
            ->assertStatus(422);

        $this->actingAs($admin)->postJson('/api/admin/users/' . $owner->id . '/restore')->assertOk();
        $this->assertNotNull(User::find($owner->id));
        $this->assertDatabaseHas('admin_audit_events', [
            'actor_user_id' => $admin->id, 'target_type' => 'user',
            'target_id' => $owner->id, 'action' => 'restore',
        ]);
        $this->postJson('/api/auth/login', ['email' => $owner->email, 'password' => 'test-password'])
            ->assertOk()->assertJsonPath('user.id', $owner->id);
        $this->assertDatabaseHas('trip_user', ['trip_id' => $trip->id, 'user_id' => $owner->id]);
    }

    public function test_admin_cannot_soft_delete_another_admin(): void
    {
        $admin = $this->user('admin');
        $otherAdmin = $this->user('admin');

        $this->actingAs($admin)->deleteJson('/api/admin/users/' . $otherAdmin->id)->assertForbidden();
        $this->assertNotNull(User::find($otherAdmin->id));
    }

    public function test_audit_history_records_admin_reads_and_changes_without_request_values(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $activity = Activity::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id,
            'title' => 'Before', 'location' => '', 'description' => '',
        ]);

        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertOk();
        $this->assertDatabaseCount('admin_audit_events', 0);
        $this->actingAs($admin)->getJson('/api/trips/' . $trip->id)->assertOk();
        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id, ['title' => 'After'])->assertOk();
        $this->actingAs($admin)->putJson('/api/activities/' . $activity->id, ['title' => 'Private details'])->assertOk();
        $this->actingAs($admin)->putJson('/api/activities/not-found', ['title' => 'No change'])->assertNotFound();

        $this->assertDatabaseCount('admin_audit_events', 3);
        $this->assertDatabaseHas('admin_audit_events', [
            'actor_user_id' => $admin->id, 'trip_id' => $trip->id,
            'target_type' => 'trip', 'target_id' => $trip->id, 'action' => 'view',
        ]);
        $event = DB::table('admin_audit_events')->where('target_id', $activity->id)->first();
        $this->assertNotNull($event);
        $this->assertSame($trip->id, $event->trip_id);
        $this->assertSame('update', $event->action);
        $this->assertSame(['title'], json_decode($event->details, true, 512, JSON_THROW_ON_ERROR)['fields']);
        $this->assertStringNotContainsString('Private details', $event->details);
        $this->actingAs($owner)->getJson('/api/admin/audit-events')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/admin/audit-events?trip=' . $trip->id)
            ->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('data.0.targetId', $activity->id);
        $this->assertDatabaseCount('admin_audit_events', 3);
    }

    public function test_admin_sync_of_another_trip_is_audited_and_unscoped_sync_excludes_it(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        SyncEvent::create([
            'entity' => 'activity', 'entity_id' => (string) Str::uuid(),
            'operation' => 'upsert', 'trip_id' => $trip->id,
            'payload' => [], 'created_at_ms' => 1,
        ]);

        $this->actingAs($admin)->getJson('/api/sync')->assertOk()->assertJsonCount(0, 'changes');
        $this->actingAs($admin)->getJson('/api/sync?tripId=' . $trip->id)
            ->assertOk()->assertJsonFragment(['entity' => 'activity']);
        $this->assertDatabaseHas('admin_audit_events', [
            'actor_user_id' => $admin->id, 'trip_id' => $trip->id,
            'target_type' => 'trip', 'action' => 'view',
        ]);
    }

    public function test_tasks_under_a_deleted_list_cannot_be_reached_by_direct_id(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $list = TaskList::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id,
            'title' => 'List', 'index' => 0, 'status' => 0,
        ]);
        $task = Task::create([
            'id' => (string) Str::uuid(), 'task_list_id' => $list->id,
            'title' => 'Task', 'index' => 0, 'status' => 0,
        ]);

        $this->actingAs($admin)->deleteJson('/api/admin/trips/' . $trip->id . '/content/task-lists/' . $list->id)
            ->assertOk();
        $this->actingAs($owner)->putJson('/api/tasks/' . $task->id, ['title' => 'Hidden'])
            ->assertNotFound();
        $this->actingAs($admin)->getJson('/api/admin/trips/' . $trip->id . '/content')
            ->assertOk()->assertJsonFragment(['id' => $task->id, 'entity' => 'tasks']);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/task-lists/' . $list->id . '/restore')
            ->assertOk();
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('taskList.0.task.0.id', $task->id);
    }

    public function test_role_can_only_be_granted_by_operator_command(): void
    {
        $user = $this->user();
        $this->artisan('user:set-role', ['email' => $user->email, 'role' => 'admin'])
            ->assertSuccessful();
        $this->assertTrue($user->fresh()->isAdmin());
        $this->artisan('user:set-role', ['email' => $user->email, 'role' => 'user'])
            ->assertSuccessful();
        $this->assertFalse($user->fresh()->isAdmin());
    }

    public function test_restoring_a_deleted_comment_group_recovers_its_thread(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $activity = Activity::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id,
            'title' => 'Place', 'location' => '', 'description' => '',
        ]);
        $group = CommentGroup::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'status' => 0,
        ]);
        CommentGroupObject::create([
            'id' => $group->id, 'comment_group_id' => $group->id,
            'object_type' => 1, 'object_id' => $activity->id,
        ]);
        $comment = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'Debug note',
        ]);

        $this->actingAs($owner)->deleteJson('/api/activities/' . $activity->id)->assertOk();
        $this->assertSoftDeleted('comment_groups', ['id' => $group->id]);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/activities/' . $activity->id . '/restore')
            ->assertOk();
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/comment-groups/' . $group->id . '/restore')
            ->assertOk();
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('commentGroup.0.comment.0.id', $comment->id);
        $this->actingAs($admin)->deleteJson('/api/admin/trips/' . $trip->id . '/content/activities/' . $activity->id)
            ->assertOk();
        $this->assertSoftDeleted('comment_groups', ['id' => $group->id]);
    }
}
