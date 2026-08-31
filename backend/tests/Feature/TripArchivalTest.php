<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TripArchivalTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::create([
            'id' => (string) Str::uuid(),
            'handle' => 'user_' . Str::lower(Str::random(8)),
            'email' => Str::lower(Str::random(8)) . '@example.com',
            'password_hash' => password_hash('password', PASSWORD_DEFAULT),
            'activated' => true,
        ]);
    }

    private function trip(User $owner, array $overrides = []): Trip
    {
        $trip = Trip::create(array_merge([
            'id' => (string) Str::uuid(),
            'title' => 'Archive test trip',
            'region' => 'JP',
            'currency' => 'JPY',
            'origin_currency' => 'USD',
            'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => 100,
            'timestamp_end_ms' => 200,
            'sharing_level' => 0,
        ], $overrides));
        $trip->users()->attach($owner->id, [
            'id' => (string) Str::uuid(),
            'role' => 0,
            'created_at_ms' => 1,
            'updated_at_ms' => 1,
        ]);

        return $trip;
    }

    private function addMember(Trip $trip, User $user, int $role): void
    {
        $trip->users()->attach($user->id, [
            'id' => (string) Str::uuid(),
            'role' => $role,
            'created_at_ms' => 1,
            'updated_at_ms' => 1,
        ]);
    }

    public function test_owner_can_archive_and_unarchive_a_trip_idempotently(): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner);

        $archived = $this->actingAs($owner)
            ->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertOk()
            ->assertJsonPath('id', $trip->id)
            ->json('archivedAt');
        $this->assertIsInt($archived);
        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'archived_at_ms' => $archived]);

        $this->actingAs($owner)
            ->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertOk()
            ->assertJsonPath('archivedAt', $archived);

        $this->actingAs($owner)
            ->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => false])
            ->assertOk()
            ->assertJsonPath('archivedAt', null);
        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'archived_at_ms' => null]);
    }

    public function test_only_owner_can_change_archive_state(): void
    {
        $owner = $this->user();
        $editor = $this->user();
        $viewer = $this->user();
        $trip = $this->trip($owner);
        $this->addMember($trip, $editor, 1);
        $this->addMember($trip, $viewer, 2);

        $this->actingAs($editor)
            ->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertForbidden();
        $this->actingAs($viewer)
            ->patchJson('/api/trips/' . $trip->id . '/archive', ['archived' => true])
            ->assertForbidden();
        $this->assertDatabaseHas('trips', ['id' => $trip->id, 'archived_at_ms' => null]);
    }

    public function test_trip_index_returns_archived_trips_only_for_the_archived_filter(): void
    {
        $owner = $this->user();
        $active = $this->trip($owner, ['title' => 'Active', 'timestamp_end_ms' => 200]);
        $past = $this->trip($owner, ['title' => 'Past', 'timestamp_end_ms' => 50]);
        $olderArchived = $this->trip($owner, ['title' => 'Older archived', 'archived_at_ms' => 300]);
        $newerArchived = $this->trip($owner, ['title' => 'Newer archived', 'archived_at_ms' => 400]);

        $this->actingAs($owner)->getJson('/api/trips?status=active&now=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $active->id)
            ->assertJsonCount(1, 'data');
        $this->actingAs($owner)->getJson('/api/trips?status=past&now=100')
            ->assertOk()
            ->assertJsonPath('data.0.id', $past->id)
            ->assertJsonCount(1, 'data');
        $this->actingAs($owner)->getJson('/api/trips')
            ->assertOk()
            ->assertJsonMissing(['id' => $olderArchived->id])
            ->assertJsonMissing(['id' => $newerArchived->id]);
        $this->actingAs($owner)->getJson('/api/trips?status=archived')
            ->assertOk()
            ->assertJsonPath('data.0.id', $newerArchived->id)
            ->assertJsonPath('data.1.id', $olderArchived->id)
            ->assertJsonCount(2, 'data');
    }

    public function test_archived_trip_rejects_content_mutations_with_conflict(): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner, ['archived_at_ms' => 1000]);
        $activity = Activity::create([
            'id' => (string) Str::uuid(),
            'trip_id' => $trip->id,
            'title' => 'Existing activity',
            'location' => '',
            'description' => '',
        ]);

        $this->actingAs($owner)->putJson('/api/trips/' . $trip->id, ['title' => 'Blocked'])
            ->assertConflict();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/activities', [
            'title' => 'Blocked activity', 'location' => '', 'description' => '',
        ])->assertConflict();
        $this->actingAs($owner)->putJson('/api/activities/' . $activity->id, ['title' => 'Blocked direct update'])
            ->assertConflict();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/task-lists', [
            'title' => 'Blocked list', 'index' => 0, 'status' => 0,
        ])->assertConflict();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/comment-groups', [
            'content' => 'Blocked comment', 'objectType' => 0, 'objectId' => $trip->id,
        ])->assertConflict();
    }

    public function test_archived_trip_keeps_reads_and_management_exceptions_available(): void
    {
        $owner = $this->user();
        $trip = $this->trip($owner, ['archived_at_ms' => 1000]);

        $this->actingAs($owner)->getJson('/api/trips/' . $trip->id)
            ->assertOk()
            ->assertJsonPath('archivedAt', 1000);
        $this->actingAs($owner)->patchJson('/api/trips/' . $trip->id . '/sharing', ['sharingLevel' => 2])
            ->assertOk()
            ->assertJsonPath('sharingLevel', 2);
        $member = $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/members', [
            'email' => 'member@example.com', 'role' => 1,
        ])->assertCreated()->json('user');
        $this->actingAs($owner)->deleteJson('/api/trips/' . $trip->id . '/members/' . $member['id'])
            ->assertOk();
        $this->actingAs($owner)->postJson('/api/trips/' . $trip->id . '/duplicate', [
            'title' => 'Blocked copy',
            'startDateMs' => 300,
            'endDateMs' => 400,
            'includeActivities' => false,
            'includeAccommodations' => false,
            'includeMacroplans' => false,
            'includeExpenses' => false,
            'includeTasks' => false,
            'removeActivityDates' => false,
        ])->assertConflict();
        $this->actingAs($owner)->deleteJson('/api/trips/' . $trip->id)->assertOk();
    }
}
