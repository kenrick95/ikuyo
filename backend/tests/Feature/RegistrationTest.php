<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_closed_registration_is_advertised_and_blocks_password_and_guest_signup(): void
    {
        config(['auth.registration_enabled' => false]);
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('registrationEnabled', false);
        $this->postJson('/api/auth/register', ['email' => 'new@example.com', 'password' => 'password123'])->assertForbidden();
        $this->postJson('/api/auth/guest')->assertForbidden();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_registration_remains_open_by_default(): void
    {
        $this->getJson('/api/auth/me')->assertJsonPath('registrationEnabled', true);
        $this->postJson('/api/auth/register', ['email' => 'new@example.com', 'password' => 'password123'])->assertCreated();
    }

    public function test_closing_signups_preserves_existing_login_and_guest_upgrades(): void
    {
        config(['auth.registration_enabled' => false]);
        $user = User::factory()->create(['email' => 'existing@example.com', 'password_hash' => Hash::make('password123')]);
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password123'])->assertOk();
        $this->assertAuthenticatedAs($user);
        $guest = User::factory()->create(['email' => null]);
        $this->actingAs($guest)->postJson('/api/auth/upgrade', ['email' => 'upgrade@example.com', 'password' => 'password123'])->assertOk();
        $this->assertDatabaseCount('users', 2);
    }
}
