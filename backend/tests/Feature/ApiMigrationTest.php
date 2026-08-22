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

    public function test_owner_can_change_sharing_and_duplicate_a_trip(): void
    {
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Original', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1000, 'timestamp_end_ms' => 2000,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $this->actingAs($user)->patchJson('/api/trips/' . $trip->id . '/sharing', ['sharingLevel' => 2])
            ->assertOk()->assertJsonPath('sharingLevel', 2);
        $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/duplicate', [
            'title' => 'Copy', 'startDateMs' => 3000, 'endDateMs' => 4000,
            'includeActivities' => false, 'includeAccommodations' => false,
            'includeMacroplans' => false, 'includeExpenses' => false,
            'includeTasks' => false, 'removeActivityDates' => false,
        ])->assertCreated()->assertJsonStructure(['id']);
        $this->assertDatabaseHas('trips', ['title' => 'Copy', 'sharing_level' => 0]);
    }

    public function test_authenticated_trip_sync_returns_incremental_changes(): void
    {
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Sync trip', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $this->actingAs($user)->getJson('/api/sync?since=0&tripId=' . $trip->id)
            ->assertOk()->assertJsonStructure(['changes', 'nextCursor'])
            ->assertJsonPath('changes.0.entity', 'trips');
    }

    public function test_viewer_cannot_modify_a_trip(): void
    {
        $owner = $this->user();
        $viewer = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Private', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $trip->users()->attach($viewer->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $this->actingAs($viewer)->putJson('/api/trips/' . $trip->id, ['title' => 'Nope'])->assertForbidden();
    }

    public function test_activity_api_accepts_frontend_camel_case_fields(): void
    {
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Activity API', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $response = $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/activities', [
            'title' => 'Fushimi Inari',
            'location' => 'Kyoto',
            'description' => 'Torii gates',
            'timestampStart' => 1700000000000,
            'timestampEnd' => 1700003600000,
            'locationLat' => 34.9671,
            'locationLng' => 135.7727,
        ]);

        $response->assertCreated()->assertJsonPath('timestamp_start_ms', 1700000000000);
        $this->assertDatabaseHas('activities', [
            'trip_id' => $trip->id,
            'timestamp_start_ms' => 1700000000000,
            'location_lat' => 34.9671,
        ]);
    }

    public function test_public_section_visibility_hides_expenses_from_anonymous_users(): void
    {
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Public expenses hidden', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 2, 'public_show_expenses' => false,
        ]);
        $this->getJson('/api/trips/' . $trip->id)->assertOk()->assertJsonPath('expense', []);
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
