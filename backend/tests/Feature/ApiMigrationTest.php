<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ApiMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function user(array $overrides = []): User
    {
        return User::create(array_merge([
            'id' => (string) Str::uuid(),
            'handle' => 'alice_' . Str::lower(Str::random(6)),
            'email' => Str::lower(Str::random(8)) . '@example.com',
            'password_hash' => password_hash('secret-password', PASSWORD_DEFAULT),
            'activated' => true,
        ], $overrides));
    }

    public function test_authenticated_user_can_create_a_trip(): void
    {
        $user = $this->user();
        $response = $this->actingAs($user)->postJson('/api/trips', [
            'title' => 'Tokyo',
            'timestampStart' => 1775001600000,
            'timestampEnd' => 1775520000000,
            'timeZone' => 'Asia/Tokyo',
            'region' => 'JP',
            'currency' => 'JPY',
            'originCurrency' => 'USD',
        ]);

        $response->assertCreated()->assertJsonPath('title', 'Tokyo');
        $this->assertDatabaseHas('trip_user', ['user_id' => $user->id, 'role' => 0]);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', Trip::firstOrFail()->id);
    }

    public function test_private_trip_is_not_visible_to_anonymous_user(): void
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Private', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);

        $this->getJson('/api/trips/' . $trip->id)->assertUnauthorized();
    }

    public function test_public_trip_is_visible_to_anonymous_user(): void
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Public', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 2,
        ]);

        $this->getJson('/api/trips/' . $trip->id)
            ->assertOk()->assertJsonPath('title', 'Public');
    }
}
