<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
