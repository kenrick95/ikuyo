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
use App\Services\UserHandleGenerator;
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
            ->assertOk()->assertJsonPath('title', 'Updated for debugging')
            ->assertJsonPath('adminAccess', true);
    }

    public function test_admin_owner_does_not_receive_elevated_access_warning_flag(): void
    {
        $admin = $this->user('admin');
        $trip = $this->trip($admin);

        $this->actingAs($admin)->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('adminAccess', false);
        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id, ['title' => 'Mine'])
            ->assertOk()->assertJsonPath('adminAccess', false);
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

        $this->actingAs($admin)->deleteJson('/api/admin/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('deletedAt', Trip::withTrashed()->findOrFail($trip->id)->getRawOriginal('deleted_at'));
        $this->assertSoftDeleted('trips', ['id' => $trip->id]);
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertNotFound();
        $this->actingAs($admin)->getJson('/api/admin/users/' . $owner->id . '/trips')
            ->assertOk()->assertJsonPath('data.0.id', $trip->id);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/restore')
            ->assertOk()->assertJsonPath('deletedAt', null);
        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)->assertOk();
    }

    public function test_deleted_trip_membership_cannot_be_removed_by_id(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $member = DB::table('trip_user')->where('trip_id', $trip->id)->value('id');
        $trip->delete();

        $this->actingAs($admin)->deleteJson('/api/members/' . $member)->assertNotFound();
        $this->assertDatabaseHas('trip_user', ['id' => $member]);
    }

    public function test_deleted_user_handle_remains_reserved(): void
    {
        $user = $this->user();
        $handle = $user->handle;
        $user->update(['handle_key' => strtolower($handle)]);
        $user->delete();

        $this->assertTrue((new \ReflectionMethod(UserHandleGenerator::class, 'inUse'))
            ->invoke(app(UserHandleGenerator::class), $handle));
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

    public function test_deleted_invitee_requires_restore_before_reinviting(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $invitee = $this->user();
        $trip = $this->trip($owner);

        $this->actingAs($admin)->deleteJson('/api/admin/users/' . $invitee->id)->assertOk();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/members', [
            'email' => $invitee->email, 'role' => 1,
        ])->assertStatus(409);
        $this->assertDatabaseMissing('trip_user', ['trip_id' => $trip->id, 'user_id' => $invitee->id]);
        $this->actingAs($admin)->postJson('/api/admin/users/' . $invitee->id . '/restore')->assertOk();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/members', [
            'email' => $invitee->email, 'role' => 1,
        ])->assertCreated();
        $this->assertDatabaseHas('trip_user', ['trip_id' => $trip->id, 'user_id' => $invitee->id]);
    }

    public function test_admin_content_pagination_reaches_deleted_records(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $ids = [];
        for ($index = 0; $index < 3; $index++) {
            $activity = Activity::create([
                'id' => (string) Str::uuid(), 'trip_id' => $trip->id,
                'title' => 'Activity ' . $index, 'location' => '', 'description' => '',
            ]);
            $ids[] = $activity->id;
            if ($index === 2) {
                $activity->delete();
            }
        }

        $first = $this->actingAs($admin)->getJson('/api/admin/trips/' . $trip->id . '/content?limit=2')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('hasMore', true);
        $cursor = $first->json('nextCursor');
        $this->assertIsString($cursor);
        $second = $this->actingAs($admin)->getJson('/api/admin/trips/' . $trip->id . '/content?limit=2&cursor=' . urlencode($cursor))
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('hasMore', false);
        $found = array_column([...$first->json('data'), ...$second->json('data')], 'id');
        sort($found);
        sort($ids);
        $this->assertSame($ids, $found);
        $this->getJson('/api/admin/trips/' . $trip->id . '/content?cursor=bad')->assertStatus(422);
    }

    public function test_failed_audit_insert_rolls_back_admin_mutation(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        DB::statement("CREATE TRIGGER reject_admin_audit BEFORE INSERT ON admin_audit_events BEGIN SELECT RAISE(FAIL, 'audit unavailable'); END");

        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id, ['title' => 'Should roll back'])
            ->assertInternalServerError();
        $this->assertSame('Private debug trip', $trip->fresh()->title);
        $this->assertDatabaseCount('admin_audit_events', 0);
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

    public function test_nested_admin_edits_audit_the_leaf_task_and_comment(): void
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
            'title' => 'Before', 'index' => 0, 'status' => 0,
        ]);
        $group = CommentGroup::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'status' => 0,
        ]);
        $comment = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'Before',
        ]);

        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id . '/task-lists/' . $list->id . '/tasks/' . $task->id, [
            'title' => 'After',
        ])->assertOk();
        $this->actingAs($admin)->putJson('/api/trips/' . $trip->id . '/comment-groups/' . $group->id . '/comments/' . $comment->id, [
            'content' => 'After',
        ])->assertOk();

        foreach ([['task', $task->id, 'title'], ['comment', $comment->id, 'content']] as [$type, $id, $field]) {
            $event = DB::table('admin_audit_events')->where('target_type', $type)->where('target_id', $id)->first();
            $this->assertNotNull($event);
            $this->assertSame($trip->id, $event->trip_id);
            $this->assertSame([$field], json_decode($event->details, true, 512, JSON_THROW_ON_ERROR)['fields']);
        }
    }

    public function test_admin_deleting_last_comment_removes_empty_group_and_object(): void
    {
        $owner = $this->user();
        $admin = $this->user('admin');
        $trip = $this->trip($owner);
        $group = CommentGroup::create([
            'id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'status' => 0,
        ]);
        CommentGroupObject::create([
            'id' => $group->id, 'comment_group_id' => $group->id,
            'object_type' => 0, 'object_id' => $trip->id,
        ]);
        $first = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'First',
        ]);
        $last = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'Last',
        ]);
        $url = '/api/admin/trips/' . $trip->id . '/content/comments/';

        $this->actingAs($admin)->deleteJson($url . $first->id)->assertOk();
        $this->assertNotNull(CommentGroup::find($group->id));
        $this->actingAs($admin)->deleteJson($url . $last->id)->assertOk();
        $this->assertSoftDeleted('comments', ['id' => $last->id]);
        $this->assertSoftDeleted('comment_groups', ['id' => $group->id]);
        $this->assertSoftDeleted('comment_group_objects', ['comment_group_id' => $group->id]);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/comment-groups/' . $group->id . '/restore')
            ->assertOk();
        $this->assertNotNull(Comment::find($last->id));
    }

    public function test_group_restore_preserves_comments_deleted_before_the_group(): void
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
        $earlier = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'Delete intentionally',
        ]);
        $withGroup = Comment::create([
            'id' => (string) Str::uuid(), 'comment_group_id' => $group->id,
            'user_id' => $owner->id, 'content' => 'Restore with group',
        ]);
        $url = '/api/admin/trips/' . $trip->id . '/content/';

        $this->actingAs($admin)->deleteJson($url . 'comments/' . $earlier->id)->assertOk();
        $this->actingAs($admin)->deleteJson($url . 'activities/' . $activity->id)->assertOk();
        $this->actingAs($admin)->postJson($url . 'activities/' . $activity->id . '/restore')->assertOk();
        $this->actingAs($admin)->postJson($url . 'comment-groups/' . $group->id . '/restore')->assertOk();

        $this->assertSoftDeleted('comments', ['id' => $earlier->id]);
        $this->assertNotNull(Comment::find($withGroup->id));
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

        DB::statement("CREATE TRIGGER reject_activity_delete BEFORE UPDATE OF deleted_at ON activities BEGIN SELECT RAISE(FAIL, 'delete unavailable'); END");
        $this->actingAs($owner)->deleteJson('/api/trips/' . $trip->id . '/activities/' . $activity->id)
            ->assertInternalServerError();
        $this->assertDatabaseHas('comment_groups', ['id' => $group->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('comment_group_objects', ['id' => $group->id, 'deleted_at' => null]);
        $this->assertDatabaseHas('comments', ['id' => $comment->id, 'deleted_at' => null, 'deleted_with_group' => false]);
        DB::statement('DROP TRIGGER reject_activity_delete');

        $this->actingAs($owner)->deleteJson('/api/activities/' . $activity->id)->assertOk();
        $this->assertSoftDeleted('comment_groups', ['id' => $group->id]);
        $this->actingAs($admin)->postJson('/api/admin/trips/' . $trip->id . '/content/comment-groups/' . $group->id . '/restore')
            ->assertStatus(409);
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
