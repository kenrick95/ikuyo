<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'app.url' => 'https://ikuyo.test',
            'services.google.client_id' => 'client',
            'services.google.client_secret' => 'secret',
            'services.google.redirect_uri' => 'https://ikuyo.test/api/auth/google/callback',
        ]);
        Http::preventStrayRequests();
    }

    private function user(array $attributes = []): User
    {
        return User::create(array_merge([
            'id' => (string) Str::uuid(), 'handle' => Str::random(12),
            'email' => 'traveller@gmail.com', 'activated' => true,
        ], $attributes));
    }

    private function start(bool $upgrade = false): array
    {
        $response = $this->postJson('/api/auth/google', ['upgrade' => $upgrade])->assertOk();
        parse_str(parse_url($response->json('url'), PHP_URL_QUERY), $query);

        return $query;
    }

    private function google(array $profile = []): void
    {
        Http::swap(new Factory);
        Http::preventStrayRequests();
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-token']),
            'openidconnect.googleapis.com/v1/userinfo' => Http::response(array_merge([
                'sub' => 'google-user', 'email' => 'traveller@gmail.com', 'email_verified' => true,
            ], $profile)),
        ]);
    }

    private function finishGoogle(array $query): TestResponse
    {
        return $this->get('/api/auth/google/callback?' . http_build_query([
            'state' => $query['state'], 'code' => 'google-code',
        ]));
    }

    public function test_configuration_is_optional_and_start_is_unavailable_without_credentials(): void
    {
        config(['services.google.client_secret' => null]);
        $this->getJson('/api/auth/google')->assertExactJson(['enabled' => false]);
        $this->postJson('/api/auth/google')->assertStatus(503);
        Http::assertNothingSent();
    }

    public function test_new_account_uses_pkce_and_callback_cannot_be_replayed(): void
    {
        $this->google();
        $query = $this->start();
        $this->assertSame('openid email', $query['scope']);
        $this->assertSame('S256', $query['code_challenge_method']);
        $oldSession = session()->getId();
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/trip');
        $user = User::sole();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('google-user', $user->google_subject);
        $this->assertTrue((bool) $user->email_verified);
        $this->assertNull($user->password_hash);
        $this->assertNotSame($oldSession, session()->getId());
        Http::assertSent(function (Request $request) use ($query): bool {
            if ($request->url() !== 'https://oauth2.googleapis.com/token') {
                return false;
            }
            $challenge = rtrim(strtr(base64_encode(hash('sha256', $request['code_verifier'], true)), '+/', '-_'), '=');

            return $challenge === $query['code_challenge']
                && $request['redirect_uri'] === $query['redirect_uri']
                && $request['client_secret'] === 'secret';
        });
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/login?google_error=expired');
        Http::assertSentCount(2);
    }

    public function test_wrong_missing_and_expired_state_never_contact_google(): void
    {
        $this->get('/api/auth/google/callback?code=code')->assertRedirect('https://ikuyo.test/login?google_error=expired');
        $query = $this->start();
        $this->finishGoogle(['state' => 'wrong'])->assertRedirect('https://ikuyo.test/login?google_error=expired');
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/login?google_error=expired');
        $query = $this->start();
        $this->travel(11)->minutes();
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/login?google_error=expired');
        Http::assertNothingSent();
        $this->assertGuest();
    }

    public function test_cancelled_and_failed_google_requests_leave_user_signed_out(): void
    {
        $query = $this->start();
        $this->get('/api/auth/google/callback?state=' . $query['state'] . '&error=access_denied')
            ->assertRedirect('https://ikuyo.test/login?google_error=cancelled');
        Http::assertNothingSent();
        Http::fake(['oauth2.googleapis.com/token' => Http::response(['error' => 'invalid_grant'], 400)]);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=failed');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_unverified_or_invalid_google_identity_is_rejected(): void
    {
        foreach ([['email_verified' => false], ['sub' => ''], ['email' => 'invalid']] as $profile) {
            $this->google($profile);
            $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=unverified');
            $this->assertGuest();
            $this->assertDatabaseCount('users', 0);
        }
    }

    public function test_imported_account_is_linked_without_changing_id_or_password(): void
    {
        $user = $this->user(['auth_namespace_id' => 'instant-user', 'password_hash' => 'existing-hash']);
        $this->google(['email' => 'Traveller@gmail.com']);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/trip');
        $this->assertAuthenticatedAs($user);
        $this->assertSame('existing-hash', $user->fresh()->password_hash);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_linked_subject_remains_stable_when_google_email_changes(): void
    {
        $user = $this->user(['google_subject' => 'google-user', 'email_verified' => false]);
        $this->google(['email' => 'changed@example.com']);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/trip');
        $this->assertAuthenticatedAs($user);
        $this->assertSame('traveller@gmail.com', $user->fresh()->email);
        $this->assertFalse((bool) $user->fresh()->email_verified);
    }

    public function test_unsafe_email_matches_and_different_subjects_are_not_linked(): void
    {
        $user = $this->user(['password_hash' => 'unverified-password']);
        $this->google();
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=link_required');
        $user->update(['email' => 'traveller@example.com', 'email_verified' => true]);
        $this->google(['email' => 'traveller@example.com']);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=link_required');
        $user->update(['google_subject' => 'another-google-user']);
        $this->google(['email' => 'traveller@example.com', 'hd' => 'example.com']);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=link_required');
        $this->assertGuest();
    }

    public function test_verified_workspace_and_invited_passwordless_accounts_can_sign_in(): void
    {
        $user = $this->user(['email' => 'traveller@example.com', 'email_verified' => true, 'password_hash' => 'hash']);
        $this->google(['email' => 'traveller@example.com', 'hd' => 'example.com']);
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/trip');
        $this->assertAuthenticatedAs($user);
        Auth::logout();
        $user->update(['email' => 'traveller@gmail.com', 'google_subject' => null, 'password_hash' => null, 'activated' => false]);
        $this->google();
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/trip');
        $this->assertTrue((bool) $user->fresh()->activated);
    }

    public function test_guest_upgrade_keeps_user_and_trips(): void
    {
        $guest = $this->user(['email' => null]);
        $this->actingAs($guest)->postJson('/api/trips', [
            'title' => 'Guest trip', 'timestampStart' => 0, 'timestampEnd' => 86400000,
            'timeZone' => 'Asia/Singapore', 'region' => 'SG', 'currency' => 'SGD', 'originCurrency' => 'SGD',
        ])->assertCreated();
        $this->google();
        $this->finishGoogle($this->start(true))->assertRedirect('https://ikuyo.test/account/edit');
        $this->assertAuthenticatedAs($guest);
        $this->assertSame('traveller@gmail.com', $guest->fresh()->email);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('trip_user', ['user_id' => $guest->id]);
    }

    public function test_guest_upgrade_does_not_switch_to_an_existing_account(): void
    {
        $existing = $this->user(['google_subject' => 'google-user']);
        $guest = $this->user(['email' => null]);
        $this->actingAs($guest);
        $this->google();
        $this->finishGoogle($this->start(true))->assertRedirect('https://ikuyo.test/account/upgrade?google_error=conflict');
        $this->assertAuthenticatedAs($guest);
        $this->assertNull($guest->fresh()->email);
        $this->assertSame('google-user', $existing->fresh()->google_subject);
    }

    public function test_deleted_account_is_not_recreated_or_restored(): void
    {
        $user = $this->user(['google_subject' => 'google-user']);
        $user->delete();
        $this->google();
        $this->finishGoogle($this->start())->assertRedirect('https://ikuyo.test/login?google_error=unavailable');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 1);
        $this->assertSoftDeleted($user);
    }

    public function test_session_account_change_invalidates_flow(): void
    {
        $query = $this->start();
        $this->actingAs($this->user(['email' => null]));
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/login?google_error=expired');
        Http::assertNothingSent();
    }

    public function test_guest_deleted_during_google_flow_cannot_be_upgraded(): void
    {
        $guest = $this->user(['email' => null]);
        $this->actingAs($guest);
        $query = $this->start(true);
        User::findOrFail($guest->id)->delete();
        $this->google();
        $this->finishGoogle($query)->assertRedirect('https://ikuyo.test/account/upgrade?google_error=conflict');
        $this->assertNull($guest->fresh()->google_subject);
    }

    public function test_guest_upgrade_rejects_email_collision_even_without_an_existing_google_link(): void
    {
        $this->user();
        $guest = $this->user(['email' => null]);
        $this->actingAs($guest);
        $this->google();
        $this->finishGoogle($this->start(true))->assertRedirect('https://ikuyo.test/account/upgrade?google_error=conflict');
        $this->assertAuthenticatedAs($guest);
        $this->assertNull($guest->fresh()->email);
    }

    public function test_upgrade_intent_requires_a_guest_and_regular_login_requires_no_session(): void
    {
        $this->postJson('/api/auth/google', ['upgrade' => true])->assertUnprocessable();
        $this->actingAs($this->user());
        $this->postJson('/api/auth/google', ['upgrade' => true])->assertUnprocessable();
        $this->postJson('/api/auth/google')->assertUnprocessable();
        Http::assertNothingSent();
    }
}
