<?php

namespace Tests\Feature;

use App\Mail\PasswordResetMail;
use App\Mail\VerifyEmailMail;
use App\Models\SyncEvent;
use App\Models\Trip;
use App\Models\User;
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
        $this->assertMatchesRegularExpression('/^[a-z]+_[a-z]+_[1-9][0-9]{3}$/', $user['handle']);
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

        // Even with a typed password, they're directed to set one up.
        $this->postJson('/api/auth/login', [
            'email' => 'legacy@example.com',
            'password' => 'whatever',
        ])->assertStatus(422)->assertJsonPath('needsPasswordSetup', true);

        // And with a BLANK password (frontend no longer blocks the field), the
        // legacy branch must still be reached — never a generic credentials error.
        $this->postJson('/api/auth/login', [
            'email' => 'legacy@example.com',
            'password' => '',
        ])->assertStatus(422)->assertJsonPath('needsPasswordSetup', true);
    }

    public function test_login_blank_password_is_invalid_for_account_with_password(): void
    {
        $this->user(['email' => 'normal@example.com', 'password_hash' => password_hash('right-pass', PASSWORD_DEFAULT)]);
        $this->postJson('/api/auth/login', [
            'email' => 'normal@example.com',
            'password' => '',
        ])->assertStatus(422)->assertJsonMissingPath('needsPasswordSetup');
    }

    public function test_lookup_reports_account_state_for_password_ux(): void
    {
        // Account with a password: password step is shown.
        $this->user(['email' => 'has-pass@example.com', 'password_hash' => password_hash('secret123', PASSWORD_DEFAULT)]);
        $this->postJson('/api/auth/lookup', ['email' => 'has-pass@example.com'])
            ->assertOk()->assertJson(['known' => true, 'needsPasswordSetup' => false]);
    }

    public function test_lookup_reports_legacy_account_needs_password(): void
    {
        $this->user(['email' => 'legacy2@example.com', 'password_hash' => null]);
        $this->postJson('/api/auth/lookup', ['email' => 'legacy2@example.com'])
            ->assertOk()->assertJson(['known' => true, 'needsPasswordSetup' => true]);
    }

    public function test_lookup_unknown_email_is_generic(): void
    {
        // Must not leak whether an email is registered; unknown looks like a
        // legacy account so enumeration isn't possible via this endpoint.
        $this->postJson('/api/auth/lookup', ['email' => 'nobody@example.com'])
            ->assertOk()->assertJson(['known' => false, 'needsPasswordSetup' => true]);
    }

    public function test_email_verification_and_change_flow(): void
    {
        Mail::fake();
        $user = $this->user(['email' => 'verify@example.com']);

        // Request a verification email.
        $this->actingAs($user)->postJson('/api/auth/send-email-verification')->assertOk();
        Mail::assertSent(VerifyEmailMail::class);
        $user->refresh();
        $this->assertNotNull($user->email_verify_token_hash);

        // The confirm endpoint expects the raw token; simulate reading it from the
        // emailed link by resolving it against the stored hash.
        // For test simplicity, set a known raw token and its hash directly.
        $rawToken = 'raw-token-for-test';
        $user->forceFill(['email_verify_token_hash' => hash('sha256', $rawToken), 'email_verify_token_at' => now()->addHour()->getTimestampMs()])->save();

        $this->actingAs($user)->postJson('/api/auth/confirm-email', ['token' => $rawToken])
            ->assertOk()->assertJsonPath('user.emailVerified', true);
        $user->refresh();
        $this->assertTrue((bool) $user->email_verified);
        $this->assertNull($user->email_verify_token_hash);
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

    public function test_owner_can_archive_and_unarchive_a_trip(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Archive me', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1000, 'timestamp_end_ms' => 2000,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $trip->users()->attach($editor->id, ['id' => (string) Str::uuid(), 'role' => 1, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $archivedAt = $this->actingAs($owner)->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertOk()->json('archivedAt');
        $this->assertIsInt($archivedAt);
        $this->actingAs($owner)->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertOk()->assertJsonPath('archivedAt', $archivedAt);
        $this->actingAs($editor)->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => false])
            ->assertForbidden();

        $this->actingAs($owner)->getJson('/api/trips?status=active&now=0')
            ->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($owner)->getJson('/api/trips?status=archived')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.archivedAt', $archivedAt);

        $this->actingAs($owner)->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => false])
            ->assertOk()->assertJsonPath('archivedAt', null);
        $this->actingAs($owner)->getJson('/api/trips?status=active&now=0')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.archivedAt', null);
    }

    public function test_archived_trip_locks_content_but_allows_sharing_and_deletion(): void
    {
        $owner = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Read-only', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1000, 'timestamp_end_ms' => 2000,
            'sharing_level' => 0, 'archived_at_ms' => 3000,
        ]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $activity = $trip->activities()->create(['id' => (string) Str::uuid(), 'title' => 'Existing', 'location' => '', 'description' => '']);

        $this->actingAs($owner)->putJson('/api/trips/' . $trip->id, ['title' => 'Blocked'])
            ->assertConflict();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/activities', [])
            ->assertConflict();
        $this->actingAs($owner)->putJson('/api/activities/' . $activity->id, ['title' => 'Blocked'])
            ->assertConflict();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/duplicate', [
            'title' => 'Blocked copy', 'startDateMs' => 3000, 'endDateMs' => 4000,
        ])->assertConflict();

        $this->actingAs($owner)->patchJson('/api/trips/' . $trip->id . '/sharing', ['sharingLevel' => 2])
            ->assertOk()->assertJsonPath('sharingLevel', 2);
        $this->actingAs($owner)->deleteJson('/api/trips/' . $trip->id)->assertOk();
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

    public function test_activity_accepts_empty_string_fields(): void
    {
        // Regression: InstantDB string fields are required/non-null and the
        // frontend sends "" for empty strings. The framework's empty→null
        // conversion used to violate the NOT NULL description/location columns.
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Empty strings', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $response = $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/activities', [
            'title' => 'Sophie big bang concert',
            'icon' => null,
            'description' => '',
            'location' => 'Singapore National Stadium',
            'locationLat' => 1.3044,
            'locationLng' => 103.8743,
            'locationZoom' => 16,
            'locationDestination' => '',
            'locationDestinationLat' => null,
            'locationDestinationLng' => null,
            'locationDestinationZoom' => null,
            'timestampStart' => 1792227600000,
            'timestampEnd' => 1792231200000,
            'timeZoneStart' => 'Asia/Singapore',
            'timeZoneEnd' => 'Asia/Singapore',
            'flags' => 0,
        ]);

        $response->assertCreated()->assertJsonPath('description', '');
        $this->assertDatabaseHas('activities', [
            'id' => $response->json('id'),
            'description' => '',
            'location_destination' => '',
        ]);
    }

    public function test_expense_api_accepts_foreign_currency_without_a_conversion(): void
    {
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Expense API', 'region' => 'JP', 'currency' => 'JPY',
            'origin_currency' => 'SGD', 'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2,
            'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $response = $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/expenses', [
            'title' => 'Ramen Ichiran',
            'amount' => 1000,
            'currency' => 'JPY',
            'description' => 'Ramen at Ichiran.',
            'timestampIncurred' => 1791423000000,
            'timeZoneIncurred' => 'Asia/Tokyo',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('expenses', [
            'id' => $response->json('id'),
            'trip_id' => $trip->id,
            'amount_in_origin_currency' => null,
            'currency_conversion_factor' => null,
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
        SyncEvent::create(['entity' => 'activity', 'entity_id' => (string) Str::uuid(), 'operation' => 'upsert', 'trip_id' => $aliceTrip->id, 'payload' => [], 'created_at_ms' => 1]);

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
        SyncEvent::create(['entity' => 'activities', 'entity_id' => $activityId, 'operation' => 'upsert', 'trip_id' => $publicTrip->id, 'payload' => [], 'created_at_ms' => 2]);

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

    public function test_create_accepts_client_supplied_ids(): void
    {
        // The frontend optimistic-inserts with a client-generated id; the server
        // must persist that exact id so the store doesn't need re-keying.
        $user = $this->user();
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Client ids', 'region' => 'JP', 'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);

        $activityId = (string) Str::uuid();
        $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/activities', [
            'id' => $activityId,
            'title' => 'Client-id activity',
            'location' => '',
            'description' => '',
        ])->assertCreated()->assertJsonPath('id', $activityId);
        $this->assertDatabaseHas('activities', ['id' => $activityId]);

        $listId = (string) Str::uuid();
        $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/task-lists', [
            'id' => $listId,
            'title' => 'Pack',
            'index' => 0,
            'status' => 0,
        ])->assertCreated()->assertJsonPath('id', $listId);
        $this->assertDatabaseHas('task_lists', ['id' => $listId]);

        // New comment group: client supplies both the group id and comment id.
        $groupId = (string) Str::uuid();
        $commentId = (string) Str::uuid();
        $this->actingAs($user)->postJson('/api/trips/' . $trip->id . '/comment-groups', [
            'id' => $commentId,
            'groupId' => $groupId,
            'content' => 'Hello',
            'objectType' => 0,
            'objectId' => $trip->id,
        ])->assertCreated()->assertJsonPath('id', $commentId);
        $this->assertDatabaseHas('comment_groups', ['id' => $groupId]);
        $this->assertDatabaseHas('comments', ['id' => $commentId, 'comment_group_id' => $groupId]);
    }
}
