<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\Trip;
use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PruneInactiveUsersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['session.driver' => 'database']);
    }

    private function oldUser(array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        DB::table('users')->where('id', $user->id)->update([
            'created_at_ms' => now()->subDays(120)->getTimestampMs(),
            'updated_at_ms' => now()->subDays(120)->getTimestampMs(),
            'last_login_at' => now()->subDays(120)->getTimestampMs(),
        ]);

        return $user->fresh();
    }

    public function test_preview_does_not_delete_and_execute_is_bounded_and_repeatable(): void
    {
        $this->oldUser(['email' => null]);
        $this->oldUser(['password_hash' => 'hash']);
        $this->artisan('users:prune-inactive')->expectsOutputToContain('Dry run: 2 eligible accounts')->assertSuccessful();
        $this->assertSame(2, User::count());
        $this->artisan('users:prune-inactive --execute --limit=1')->expectsOutputToContain('Soft-deleted 1')->assertSuccessful();
        $this->assertSame(1, User::count());
        $this->artisan('users:prune-inactive --execute')->assertSuccessful();
        $this->artisan('users:prune-inactive --execute')->expectsOutputToContain('Soft-deleted 0')->assertSuccessful();
        $this->assertSame(0, User::count());
        $this->assertSame(2, User::withTrashed()->count());
    }

    public function test_verified_imported_linked_admin_invited_and_recent_users_are_preserved(): void
    {
        $this->oldUser(['email_verified' => true, 'password_hash' => 'hash']);
        $this->oldUser(['auth_namespace_id' => (string) Str::uuid(), 'email' => null]);
        $this->oldUser(['google_subject' => 'google-user', 'email' => null]);
        $this->oldUser(['role' => 'admin', 'email' => null]);
        $this->oldUser(['activated' => false, 'email' => null]);
        $this->oldUser(); // Passwordless email invitation, even without a membership.
        $login = $this->oldUser(['email' => null]);
        DB::table('users')->where('id', $login->id)->update(['last_login_at' => now()->getTimestampMs()]);
        $updated = $this->oldUser(['email' => null]);
        DB::table('users')->where('id', $updated->id)->update(['updated_at_ms' => now()->getTimestampMs()]);
        User::factory()->create(['email' => null]);
        $active = $this->oldUser(['email' => null]);
        DB::table('sessions')->insert(['id' => 'active-session', 'user_id' => $active->id, 'payload' => '', 'last_activity' => now()->timestamp]);
        $this->artisan('users:prune-inactive --execute')->expectsOutputToContain('Soft-deleted 0')->assertSuccessful();
        $this->assertSame(10, User::count());
    }

    public function test_all_memberships_and_authored_comments_protect_users_even_on_deleted_trips(): void
    {
        $owner = $this->oldUser(['email' => null]);
        $viewer = $this->oldUser(['email' => null]);
        $author = $this->oldUser(['email' => null]);
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'JP',
            'currency' => 'JPY', 'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100, 'timestamp_end_ms' => 200,
        ]);
        foreach ([$owner, $viewer] as $index => $user) {
            $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => $index * 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        }
        $group = CommentGroup::create(['id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'status' => 0]);
        Comment::create(['id' => (string) Str::uuid(), 'comment_group_id' => $group->id, 'user_id' => $author->id, 'content' => 'Keep this']);
        $trip->delete();
        $this->artisan('users:prune-inactive --execute')->expectsOutputToContain('Soft-deleted 0')->assertSuccessful();
        $this->assertSame(3, User::count());
    }

    public function test_bad_options_and_uninspectable_sessions_do_not_delete(): void
    {
        $user = $this->oldUser(['email' => null]);
        foreach (['--days=0', '--days=invalid', '--limit=0', '--limit=1001'] as $option) {
            $this->artisan('users:prune-inactive --execute ' . $option)->assertFailed();
        }
        config(['session.driver' => 'file']);
        $this->artisan('users:prune-inactive --execute')->assertFailed();
        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_eligibility_is_rechecked_after_the_user_lock(): void
    {
        $user = $this->oldUser(['email' => null]);
        $this->assertFalse(app(AccountDeletionService::class)->delete($user, fn () => false));
        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
    }
}
