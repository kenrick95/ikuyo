<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use App\Mail\PasswordResetMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
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

    public function test_sensitive_api_routes_have_rate_limits(): void
    {
        $routes = collect(app('router')->getRoutes()->getRoutes())->keyBy(fn ($route) => $route->uri());
        $authMiddleware = $routes['api/auth/login']->middleware();
        $this->assertTrue(collect($authMiddleware)->contains(fn (string $item): bool => str_starts_with($item, 'throttle:')));
        $this->assertTrue(collect($routes['api/sync']->middleware())->contains(fn (string $item): bool => str_starts_with($item, 'throttle:')));
    }

    public function test_forgot_password_queues_a_reset_mail_without_enumeration(): void
    {
        Mail::fake();
        $user = $this->user(['email' => 'reset@example.com']);

        $this->postJson('/api/auth/forgot', ['email' => $user->email])
            ->assertOk()->assertJson(['ok' => true]);
        Mail::assertSent(PasswordResetMail::class, fn (PasswordResetMail $mail): bool => $mail->user->is($user));

        $this->postJson('/api/auth/forgot', ['email' => 'missing@example.com'])
            ->assertOk()->assertJson(['ok' => true]);
        Mail::assertSentCount(1);
    }

    public function test_register_creates_and_logs_in_a_user(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email' => 'newuser@example.com',
            'password' => 'password123',
        ])->assertCreated();

        $user = $response->json('user');
        $this->assertSame('newuser@example.com', $user['email']);
        $this->assertTrue((bool) $user['activated']);
        $this->assertNotNull($user['handle']);
        // Session established: /api/auth/me returns the new user without extra login.
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.email', 'newuser@example.com');
    }

    public function test_register_rejects_duplicate_email(): void
    {
        $this->user(['email' => 'taken@example.com']);
        $this->postJson('/api/auth/register', [
            'email' => 'taken@example.com',
            'password' => 'password123',
        ])->assertStatus(422);
    }

    public function test_login_guides_legacy_user_without_password(): void
    {
        // Legacy InstantDB account: has an email but no password_hash.
        $this->user(['email' => 'legacy@example.com', 'password_hash' => null]);

        $this->postJson('/api/auth/login', [
            'email' => 'legacy@example.com',
            'password' => 'whatever',
        ])->assertStatus(422)->assertJsonPath('needsPasswordSetup', true);
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

    public function test_sync_returns_delete_tombstone_after_entity_deletion(): void
    {
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Sync delete', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $activity = $trip->activities()->create(['id' => (string) Str::uuid(), 'title' => 'Delete me', 'location' => '', 'description' => '']);
        $activity->delete();

        $this->actingAs($user)->getJson('/api/sync?cursor=0&tripId=' . $trip->id)
            ->assertOk()
            ->assertJsonFragment(['entity' => 'activities', 'id' => $activity->id, 'op' => 'delete']);
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

    public function test_metadata_endpoint_exposes_only_public_trip_metadata(): void
    {
        $public = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Public metadata', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 2,
        ]);
        $private = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Private metadata', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);

        $this->getJson('/api/metadata/trips/' . $public->id)->assertOk()->assertJsonPath('title', 'Public metadata');
        $this->getJson('/api/metadata/trips/' . $private->id)->assertNotFound();
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

    public function test_trip_index_uses_authenticated_user_not_client_user_id(): void
    {
        $alice = $this->user();
        $bob = $this->user();
        $aliceTrip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Alice private', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $aliceTrip->users()->attach($alice->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        // Bob asks for Alice's trips via a spoofed user_id; must NOT see them.
        $this->actingAs($bob)->getJson('/api/trips?user_id=' . $alice->id)
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_comment_rejects_cross_trip_object_target(): void
    {
        $owner = $this->user();
        $tripA = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'A', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $tripB = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'B', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $activityB = $tripB->activities()->create(['id' => (string) Str::uuid(), 'title' => 'B act', 'location' => '', 'description' => '', 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $tripA->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $tripB->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        // An editor of trip A tries to comment on an activity that belongs to trip B.
        $this->actingAs($owner)->postJson('/api/trips/' . $tripA->id . '/comment-groups', [
            'content' => 'hi', 'objectType' => 1, 'objectId' => $activityB->id,
        ])->assertStatus(422);
    }

    public function test_sync_without_trip_scope_does_not_leak_other_trips(): void
    {
        $alice = $this->user();
        $bob = $this->user();
        $aliceTrip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Alice private', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $aliceTrip->users()->attach($alice->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        \App\Models\SyncEvent::create(['entity' => 'activity', 'entity_id' => (string) Str::uuid(), 'operation' => 'upsert', 'trip_id' => $aliceTrip->id, 'payload' => [], 'created_at_ms' => 1]);

        $this->actingAs($bob)->getJson('/api/sync')
            ->assertOk()->assertJsonCount(0, 'changes');
    }

    public function test_anonymous_user_can_sync_a_public_trip(): void
    {
        $publicTrip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Public sync', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 2,
        ]);
        $activityId = (string) Str::uuid();
        \App\Models\SyncEvent::create(['entity' => 'activities', 'entity_id' => $activityId, 'operation' => 'upsert', 'trip_id' => $publicTrip->id, 'payload' => [], 'created_at_ms' => 2]);

        // Anonymous (no session) must be able to poll sync for an openly shared trip.
        $response = $this->getJson('/api/sync?tripId=' . $publicTrip->id)
            ->assertOk();
        $entities = collect($response->json('changes'))->pluck('entity');
        $this->assertTrue($entities->contains('activities'), 'expected the activity change to be returned');
    }

    public function test_anonymous_user_cannot_sync_a_private_trip(): void
    {
        $privateTrip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Private sync', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $this->getJson('/api/sync?tripId=' . $privateTrip->id)->assertForbidden();
    }

    public function test_anonymous_user_sync_without_trip_scope_requires_auth(): void
    {
        $this->getJson('/api/sync')->assertUnauthorized();
    }
}
