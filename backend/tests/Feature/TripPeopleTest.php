<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use App\Services\AccountDeletionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Tests\TestCase;

class TripPeopleTest extends TestCase
{
    use RefreshDatabase;

    private function account(string $handle, ?string $email = null): User
    {
        return User::create(['id' => (string) Str::uuid(), 'handle' => $handle, 'email' => $email, 'activated' => true]);
    }

    private function trip(User $owner): Trip
    {
        $trip = Trip::create(['id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'SG', 'currency' => 'SGD', 'origin_currency' => 'SGD', 'timezone' => 'Asia/Singapore', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0]);
        $trip->users()->attach($owner->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $this->actingAs($owner);

        return $trip;
    }

    private function person(Trip $trip, array $fields): string
    {
        return $this->postJson("/api/trips/$trip->id/people", ['id' => (string) Str::uuid(), ...$fields])->assertCreated()->json('id');
    }

    private function people(Trip $trip): array
    {
        return $this->getJson("/api/trips/$trip->id")->assertOk()->json('people');
    }

    public function test_name_only_people_and_guest_accounts_are_distinct_and_do_not_grant_access(): void
    {
        $owner = $this->account('owner', 'owner@example.com');
        $trip = $this->trip($owner);
        $guest = $this->account('guest_account');
        $nameOnly = $this->person($trip, ['name' => 'Bea']);
        $linked = $this->person($trip, ['userId' => $guest->id]);
        $people = collect($this->people($trip));
        $this->assertFalse($people->firstWhere('id', $nameOnly)['hasAccount']);
        $this->assertNull($people->firstWhere('id', $nameOnly)['accountType']);
        $this->assertTrue($people->firstWhere('id', $linked)['hasAccount']);
        $this->assertSame('guest', $people->firstWhere('id', $linked)['accountType']);
        $this->assertNull($people->firstWhere('id', $linked)['accessRole']);
        $this->assertTrue($people->firstWhere('id', $linked)['isParticipant']);
        $this->assertSame(1, $trip->users()->count());
        $this->actingAs($guest)->getJson("/api/trips/$trip->id")->assertForbidden();
        $this->actingAs($owner)->postJson("/api/trips/$trip->id/members", ['email' => '@guest_account', 'role' => 2])->assertCreated();
        $this->assertSame($linked, collect($this->people($trip))->firstWhere('userId', $guest->id)['id']);
        $this->assertSame(2, collect($this->people($trip))->firstWhere('id', $linked)['accessRole']);
        $guest->update(['email' => 'upgraded@example.com']);
        $upgraded = collect($this->people($trip))->firstWhere('id', $linked);
        $this->assertSame('registered', $upgraded['accountType']);
        $this->assertSame($guest->id, $upgraded['userId']);
    }

    public function test_sharing_and_participation_change_independently_in_both_directions(): void
    {
        $trip = $this->trip($this->account('owner', 'owner@example.com'));
        $planner = $this->account('planner', 'planner@example.com');
        $this->postJson("/api/trips/$trip->id/members", ['email' => $planner->email, 'role' => 1])->assertCreated();
        $this->assertSame([], $this->people($trip));
        $this->postJson("/api/trips/$trip->id/members", ['email' => $planner->email, 'role' => 1, 'addToParticipants' => true])->assertCreated();
        $person = $this->people($trip)[0];
        $this->assertTrue($person['isParticipant']);
        $this->assertSame(1, $person['accessRole']);
        $this->patchJson("/api/trips/$trip->id/people/{$person['id']}", ['isParticipant' => false])->assertOk();
        $this->assertSame(1, $this->people($trip)[0]['accessRole']);
        $this->patchJson("/api/trips/$trip->id/people/{$person['id']}", ['isParticipant' => true, 'archived' => true])->assertOk();
        $this->assertSame(1, $this->people($trip)[0]['accessRole']);
        $membership = DB::table('trip_user')->where('trip_id', $trip->id)->where('user_id', $planner->id)->value('id');
        $this->deleteJson("/api/members/$membership")->assertOk();
        $this->assertTrue($this->people($trip)[0]['isParticipant']);
        $this->assertNull($this->people($trip)[0]['accessRole']);
    }

    public function test_linking_preserves_financial_identity_and_rejects_implicit_merging(): void
    {
        $trip = $this->trip($this->account('owner', 'owner@example.com'));
        $person = $this->person($trip, ['name' => 'Bea']);
        $account = $this->account('bea_account');
        $expense = ['id' => (string) Str::uuid(), 'title' => 'Room', 'amount' => '60', 'currency' => 'SGD', 'timestampIncurred' => 1, 'ledger' => ['paidBy' => $person, 'method' => 'equal', 'shares' => [['participantId' => $person]]]];
        $saved = $this->postJson("/api/trips/$trip->id/expenses", $expense)->assertCreated()->json('ledger');
        $this->patchJson("/api/trips/$trip->id/people/$person", ['userId' => $account->id])->assertOk();
        $this->getJson("/api/trips/$trip->id")->assertJsonPath('expense.0.ledger', $saved)->assertJsonPath('expense.0.ledger_revision', 1);
        $this->assertSame('Bea', $this->people($trip)[0]['name']);
        $other = $this->person($trip, ['name' => 'Other']);
        $this->patchJson("/api/trips/$trip->id/people/$other", ['userId' => $account->id])->assertConflict();
        $this->patchJson("/api/trips/$trip->id/people/$person", ['userId' => null])->assertOk();
        $this->getJson("/api/trips/$trip->id")->assertJsonPath('expense.0.ledger', $saved);
        $this->assertFalse(collect($this->people($trip))->firstWhere('id', $person)['hasAccount']);
    }

    public function test_default_payers_are_not_automatically_marked_as_joining(): void
    {
        $owner = $this->account('planner', 'planner@example.com');
        $trip = $this->trip($owner);
        $guest = $this->account('guest_planner');
        $this->postJson("/api/trips/$trip->id/members", ['email' => '@guest_planner', 'role' => 1])->assertCreated();
        $this->actingAs($guest)->getJson("/api/trips/$trip->id")->assertOk()->assertJsonPath('people', []);
        $this->postJson("/api/trips/$trip->id/expenses", ['title' => 'Deposit', 'amount' => '10', 'currency' => 'SGD', 'timestampIncurred' => 1, 'ledger' => ['paidBy' => 'me', 'method' => null]])->assertCreated();
        $this->assertSame($guest->id, $this->people($trip)[0]['userId']);
        $this->assertFalse($this->people($trip)[0]['isParticipant']);
        $this->assertSame('guest', $this->people($trip)[0]['accountType']);
        $this->assertSame(1, $this->people($trip)[0]['accessRole']);
    }

    public function test_people_permissions_redact_account_types_and_hide_financial_only_people_when_expenses_are_hidden(): void
    {
        $trip = $this->trip($this->account('owner', 'owner@example.com'));
        $guest = $this->account('linked_guest');
        $joining = $this->person($trip, ['userId' => $guest->id]);
        $this->person($trip, ['name' => 'Payer only', 'isParticipant' => false]);
        $viewer = $this->account('viewer', 'viewer@example.com');
        $trip->users()->attach($viewer->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $trip->update(['viewer_show_expenses' => false, 'public_show_expenses' => false, 'sharing_level' => 2]);
        $this->actingAs($viewer);
        $people = $this->people($trip);
        $this->assertCount(1, $people);
        $this->assertSame($joining, $people[0]['id']);
        $this->assertTrue($people[0]['hasAccount']);
        foreach (['userId', 'handle', 'accountType', 'accessRole'] as $field) {
            $this->assertNull($people[0][$field]);
        }
        $this->postJson("/api/trips/$trip->id/people", ['name' => 'Forbidden'])->assertForbidden();
        $this->patchJson("/api/trips/$trip->id/people/$joining", ['isParticipant' => false])->assertForbidden();
        $this->postJson("/api/trips/$trip->id/people/lookup", ['identity' => '@linked_guest'])->assertForbidden();
    }

    public function test_new_trip_creators_start_as_participants_without_tying_ownership_to_attendance(): void
    {
        $owner = $this->account('owner', 'owner@example.com');
        $this->actingAs($owner);
        $response = $this->postJson('/api/trips', ['title' => 'Trip', 'timestampStart' => 1, 'timestampEnd' => 2, 'timeZone' => 'Asia/Singapore', 'region' => 'SG', 'currency' => 'SGD', 'originCurrency' => 'SGD'])->assertCreated();
        $response->assertJsonPath('people.0.isParticipant', true)->assertJsonPath('people.0.accessRole', 0);
        $tripId = $response->json('id');
        $personId = $response->json('people.0.id');
        $this->patchJson("/api/trips/$tripId/people/$personId", ['isParticipant' => false])->assertOk();
        $this->getJson("/api/trips/$tripId")->assertOk()->assertJsonPath('people.0.isParticipant', false)->assertJsonPath('people.0.accessRole', 0);
    }

    public function test_migration_preserves_person_ids_allocations_payments_and_archive_state(): void
    {
        $trip = $this->trip($this->account('owner', 'owner@example.com'));
        $a = $this->person($trip, ['name' => 'Alex']);
        $b = $this->person($trip, ['name' => 'Bea']);
        $this->postJson("/api/trips/$trip->id/expenses", ['title' => 'Dinner', 'amount' => '60', 'currency' => 'SGD', 'timestampIncurred' => 1, 'ledger' => ['paidBy' => $a, 'method' => 'equal', 'shares' => [['participantId' => $b]]]])->assertCreated();
        $payment = ['id' => (string) Str::uuid(), 'senderId' => $b, 'recipientId' => $a, 'currency' => 'SGD', 'amountMinor' => '1000', 'date' => '2026-11-18'];
        $this->postJson("/api/trips/$trip->id/expense-payments", $payment)->assertCreated();
        $this->patchJson("/api/trips/$trip->id/people/$b", ['archived' => true])->assertOk();
        $before = $this->getJson("/api/trips/$trip->id")->json('expenseLedger');
        $migration = require database_path('migrations/2026_11_18_000001_promote_trip_people.php');
        $migration->down();
        $this->assertTrue(Schema::hasTable('expense_participants'));
        $migration->up();
        $this->assertFalse(Schema::hasTable('expense_participants'));
        $this->assertSame($before, $this->getJson("/api/trips/$trip->id")->json('expenseLedger'));
        $this->assertTrue(collect($this->people($trip))->firstWhere('id', $b)['archived']);
        $this->assertFalse(collect($this->people($trip))->firstWhere('id', $a)['isParticipant']);
        $this->postJson("/api/trips/$trip->id/expense-payments", [...$payment, 'id' => (string) Str::uuid(), 'amountMinor' => '100'])->assertCreated();
    }

    public function test_account_deletion_keeps_trip_people_and_finances_but_removes_account_links(): void
    {
        $trip = $this->trip($this->account('owner', 'owner@example.com'));
        $guest = $this->account('guest');
        $id = $this->person($trip, ['name' => 'Bea', 'userId' => $guest->id]);
        app(AccountDeletionService::class)->delete($guest);
        $person = collect($this->people($trip))->firstWhere('id', $id);
        $this->assertSame('Bea', $person['name']);
        $this->assertFalse($person['hasAccount']);
        $this->assertTrue($person['isParticipant']);
    }
}
