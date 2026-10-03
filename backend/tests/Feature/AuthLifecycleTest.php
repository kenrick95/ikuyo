<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Tests\TestCase;

class AuthLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'id' => (string) Str::uuid(), 'handle' => Str::random(12),
            'email' => 'account@example.com', 'password_hash' => Hash::make('password123'),
            'activated' => true,
        ]);
    }

    public function test_authenticated_auth_mutations_reject_a_deleted_cached_user(): void
    {
        Mail::fake();
        $user = $this->user();
        $user->update(['email' => null]);
        // Keep the instance used by authentication stale, as if deletion
        // committed after session authentication but before the mutation lock.
        User::findOrFail($user->id)->delete();

        foreach (['upgrade', 'change-email', 'send-email-verification'] as $action) {
            $this->actingAs($user)->postJson('/api/auth/' . $action, [
                'email' => 'new@example.com', 'password' => 'new-password',
            ])->assertUnauthorized();
        }
        $stored = User::withTrashed()->findOrFail($user->id);
        $this->assertNull($stored->email);
        $this->assertNull($stored->pending_email);
        $this->assertNull($stored->email_verify_token_hash);
        Mail::assertNothingSent();
    }

    public function test_deleted_accounts_cannot_receive_tokens_or_use_existing_tokens(): void
    {
        Mail::fake();
        $user = $this->user();
        $user->update([
            'reset_token' => hash('sha256', 'old-reset'), 'reset_token_at' => now()->addHour()->getTimestampMs(),
            'email_verify_token_hash' => hash('sha256', 'old-verify'), 'email_verify_token_at' => now()->addHour()->getTimestampMs(),
            'pending_email' => 'pending@example.com',
        ]);
        $this->actingAs($user)->deleteJson('/api/users/me', ['confirmation' => 'DELETE'])->assertOk();
        $this->postJson('/api/auth/forgot', ['email' => $user->email])->assertOk();
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password123'])->assertUnprocessable();
        $this->postJson('/api/auth/reset', ['resetToken' => 'old-reset', 'password' => 'new-password'])->assertNotFound();
        $this->postJson('/api/auth/confirm-email', ['token' => 'old-verify'])->assertNotFound();
        $this->assertGuest();
        $stored = User::withTrashed()->findOrFail($user->id);
        $this->assertNull($stored->reset_token);
        $this->assertNull($stored->email_verify_token_hash);
        $this->assertNull($stored->pending_email);
        $this->assertTrue(Hash::check('password123', $stored->password_hash));
        Mail::assertNothingSent();
    }

    public function test_email_and_token_selected_mutations_keep_the_user_read_and_write_in_one_transaction(): void
    {
        Mail::fake();
        $user = $this->user();
        $user->update([
            'reset_token' => hash('sha256', 'reset'), 'reset_token_at' => now()->addHour()->getTimestampMs(),
            'email_verify_token_hash' => hash('sha256', 'verify'), 'email_verify_token_at' => now()->addHour()->getTimestampMs(),
        ]);
        $level = DB::transactionLevel();
        $userQueries = 0;
        DB::listen(function (QueryExecuted $query) use ($level, &$userQueries): void {
            // Session authentication may read by ID before the middleware.
            // Credential/token lookups and all account writes must be inside it.
            if (str_starts_with($query->sql, 'update "users"')
                || str_contains($query->sql, 'where "email"')
                || str_contains($query->sql, 'where "reset_token"')
                || str_contains($query->sql, 'where "email_verify_token_hash"')) {
                $userQueries++;
                $this->assertGreaterThan($level, $query->connection->transactionLevel());
            }
        });

        $this->postJson('/api/auth/confirm-email', ['token' => 'verify'])->assertOk();
        $this->postJson('/api/auth/reset', ['resetToken' => 'reset', 'password' => 'new-password'])->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'new-password'])->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/auth/forgot', ['email' => $user->email])->assertOk();
        $this->assertGreaterThan(0, $userQueries);
    }
}
