<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use App\Services\ExpenseLedgerService;
use App\Services\ExpenseMoney;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExpenseSplittingTest extends TestCase
{
    use RefreshDatabase;

    private function setupTrip(): array
    {
        $user = User::create(['id' => (string) Str::uuid(), 'handle' => 'alex', 'email' => 'alex@example.com', 'activated' => true]);
        $trip = Trip::create(['id' => (string) Str::uuid(), 'title' => 'Trip', 'region' => 'SG', 'currency' => 'SGD', 'origin_currency' => 'SGD', 'timezone' => 'Asia/Singapore', 'timestamp_start_ms' => 1, 'timestamp_end_ms' => 2, 'sharing_level' => 0]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $ledger = app(ExpenseLedgerService::class);
        $a = $ledger->participant($trip, $user, 'alex');
        $b = $ledger->participant($trip, null, 'Bea');
        $c = $ledger->participant($trip, null, 'Chen');
        $this->actingAs($user);

        return [$trip, $user, $a, $b, $c];
    }

    private function expense(string $a, string $b, string $c, string $currency = 'SGD', string $amount = '90'): array
    {
        return ['id' => (string) Str::uuid(), 'title' => 'Dinner', 'amount' => $amount, 'currency' => $currency, 'timestampIncurred' => 1, 'ledger' => ['paidBy' => $a, 'method' => 'equal', 'shares' => array_map(fn ($id) => ['participantId' => $id], [$a, $b, $c])]];
    }

    public function test_guest_split_and_partial_payments_remain_separate_by_currency(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        foreach ([['SGD', '90'], ['JPY', '9000']] as [$currency, $amount]) {
            $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c, $currency, $amount))->assertCreated();
        }
        $snapshot = $this->getJson("/api/trips/$trip->id")->assertOk()->json('expenseLedger');
        $this->assertCount(2, $snapshot['currencies']);
        $payment = ['id' => (string) Str::uuid(), 'senderId' => $b, 'recipientId' => $a, 'currency' => 'SGD', 'amountMinor' => '2000', 'date' => '2026-11-15'];
        $this->postJson("/api/trips/$trip->id/expense-payments", $payment)->assertCreated();
        $this->postJson("/api/trips/$trip->id/expense-payments", $payment)->assertOk();
        $this->postJson("/api/trips/$trip->id/expense-payments", [...$payment, 'amountMinor' => '1000'])->assertConflict();
        $data = $this->getJson("/api/trips/$trip->id")->json('expenseLedger');
        $sgd = collect($data['currencies'])->firstWhere('currency', 'SGD');
        $this->assertSame('4000', collect($sgd['balances'])->firstWhere('participantId', $a)['amountMinor']);
        $this->assertSame('-1000', collect($sgd['balances'])->firstWhere('participantId', $b)['amountMinor']);
        $this->assertDatabaseCount('expense_payments', 1);
        $this->deleteJson("/api/trips/$trip->id/expense-payments/{$payment['id']}")->assertOk();
        $this->assertTrue($this->getJson("/api/trips/$trip->id")->json('expenseLedger.payments.0.voided'));
    }

    public function test_new_inline_expenses_record_the_current_payer_without_forcing_a_split(): void
    {
        [$trip, $user, $a] = $this->setupTrip();
        $data = ['id' => (string) Str::uuid(), 'title' => 'Coffee', 'amount' => '12', 'currency' => 'SGD', 'timestampIncurred' => 1,
            'ledger' => ['paidBy' => 'me', 'method' => null, 'shares' => []]];
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated()->assertJsonPath('ledger.paidBy', $a)->assertJsonPath('ledger.allocations', []);
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated();
        $this->assertDatabaseCount('expenses', 1);
        $this->postJson("/api/trips/$trip->id/expenses", [...$data, 'amount' => '13'])->assertConflict();
        $snapshot = $this->getJson("/api/trips/$trip->id")->assertOk()->json('expenseLedger');
        $this->assertSame([], $snapshot['currencies']);
        $this->assertSame(0, $snapshot['splitCount']);
        $this->assertDatabaseHas('expense_participants', ['id' => $a, 'user_id' => $user->id]);
    }

    public function test_multiple_payers_can_pay_for_somebody_else_and_invalid_updates_roll_back(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $data = $this->expense($a, $b, $c, 'SGD', '60');
        $data['ledger'] = ['paidBy' => 'multiple', 'method' => 'equal', 'shares' => [['participantId' => $a]],
            'contributions' => [['participantId' => $b, 'amountMinor' => '3000'], ['participantId' => $c, 'amountMinor' => '3000']]];
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated();
        $snapshot = $this->getJson("/api/trips/$trip->id")->json('expenseLedger.currencies.0.balances');
        $this->assertSame('-6000', collect($snapshot)->firstWhere('participantId', $a)['amountMinor']);
        $data['ledger']['contributions'][0]['amountMinor'] = '1';
        $this->putJson("/api/expenses/{$data['id']}", [...$data, 'expectedRevision' => 1])->assertUnprocessable();
        $this->assertDatabaseHas('expenses', ['id' => $data['id'], 'ledger_revision' => 1]);
    }

    public function test_rounding_methods_and_foreign_participants_are_validated(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        foreach ([['SGD', '10', ['333', '333', '334']], ['JPY', '100', ['33', '33', '34']], ['KWD', '1', ['333', '333', '334']]] as [$currency, $amount, $expected]) {
            $json = $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c, $currency, $amount))->assertCreated()->json();
            $actual = array_column($json['ledger']['allocations'], 'amountMinor');
            sort($actual);
            $this->assertEquals($expected, $actual);
        }
        $data = $this->expense($a, $b, $c);
        $data['ledger']['shares'][0]['participantId'] = 'foreign';
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertUnprocessable();
        $data = $this->expense($a, $b, $c);
        $data['ledger']['method'] = 'percent';
        $data['ledger']['shares'] = [['participantId' => $a, 'value' => '25'], ['participantId' => $b, 'value' => '75']];
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated()->assertJsonPath('ledger.allocations.0.amountMinor', (strcmp($a, $b) < 0) ? '2250' : '6750');
        $this->assertSame(1_000, ExpenseMoney::minor('1.000', 'KWD'));
    }

    public function test_edit_aliases_cannot_bypass_ledger_validation_and_legacy_rows_stay_unsplit(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $data = $this->expense($a, $b, $c);
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated();
        $this->putJson("/api/expenses/{$data['id']}", ['amount' => '100'])->assertConflict();
        $this->putJson("/api/trips/$trip->id/expenses/{$data['id']}", ['ledger' => null, 'expectedRevision' => 0])->assertConflict();
        $this->putJson("/api/expenses/{$data['id']}", ['ledger' => null, 'expectedRevision' => 1])->assertOk()->assertJsonPath('ledger', null);
        $data = $this->expense($a, $b, $c);
        unset($data['ledger']);
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated()->assertJsonPath('ledger', null);
        $this->assertDatabaseCount('expense_participants', 3);
        $this->assertSame(0, $this->getJson("/api/trips/$trip->id")->json('expenseLedger.splitCount'));
    }

    public function test_account_lookup_does_not_grant_membership_and_archive_locks_mutations(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $other = User::create(['id' => (string) Str::uuid(), 'handle' => 'morgan', 'email' => 'morgan@example.com']);
        $this->postJson("/api/trips/$trip->id/expense-participants/lookup", ['identity' => '@morgan'])->assertOk()->assertJsonPath('user.id', $other->id);
        $this->postJson("/api/trips/$trip->id/expense-participants", ['id' => (string) Str::uuid(), 'userId' => $other->id])->assertCreated();
        $this->assertSame(1, $trip->users()->count());
        $trip->update(['archived_at_ms' => 1]);
        $this->postJson("/api/trips/$trip->id/expense-participants", ['id' => (string) Str::uuid(), 'name' => 'Dana'])->assertConflict();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c))->assertConflict();
    }

    public function test_hidden_expenses_do_not_expose_the_ledger_or_sync_events(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c))->assertCreated();
        $trip->update(['sharing_level' => 2, 'public_show_expenses' => false, 'viewer_show_expenses' => false]);
        $viewer = User::create(['id' => (string) Str::uuid(), 'handle' => 'viewer']);
        $trip->users()->attach($viewer->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $this->actingAs($viewer)->getJson("/api/trips/$trip->id")->assertOk()->assertJsonPath('expenseLedger', null)->assertJsonPath('expense', []);
        $events = $this->getJson("/api/sync?tripId=$trip->id")->assertOk()->json('changes');
        $this->assertEmpty(array_filter($events, fn ($e) => in_array($e['entity'], ['expense', 'expenses', 'expense_ledger'], true)));
        $this->postJson("/api/trips/$trip->id/expense-payments", [])->assertForbidden();
    }

    public function test_refunds_reverse_shares_after_settlement_and_cannot_exceed_the_original(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $original = $this->expense($a, $b, $c);
        $this->postJson("/api/trips/$trip->id/expenses", $original)->assertCreated();
        foreach ([$b, $c] as $sender) {
            $this->postJson("/api/trips/$trip->id/expense-payments", ['id' => (string) Str::uuid(), 'senderId' => $sender, 'recipientId' => $a, 'currency' => 'SGD', 'amountMinor' => '3000', 'date' => '2026-11-15'])->assertCreated();
        }
        $refund = $this->expense($a, $b, $c, 'SGD', '30');
        $refund['ledger']['kind'] = 'refund';
        $refund['ledger']['refundOf'] = $original['id'];
        $this->postJson("/api/trips/$trip->id/expenses", $refund)->assertCreated();
        $nets = $this->getJson("/api/trips/$trip->id")->json('expenseLedger.currencies.0.balances');
        $this->assertSame('-2000', collect($nets)->firstWhere('participantId', $a)['amountMinor']);
        $this->assertSame('1000', collect($nets)->firstWhere('participantId', $b)['amountMinor']);
        $this->postJson("/api/trips/$trip->id/expenses", [...$refund, 'id' => (string) Str::uuid(), 'amount' => '70'])->assertUnprocessable();
        $this->putJson("/api/expenses/{$original['id']}", [...$original, 'amount' => '20', 'expectedRevision' => 1])->assertUnprocessable();
        $this->assertSame(2, $this->getJson("/api/trips/$trip->id")->json('expenseLedger.expenseCount'));
    }

    public function test_cross_currency_payment_clears_only_the_agreed_debt_and_preserves_both_amounts(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c, 'JPY', '9000'))->assertCreated();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c, 'SGD', '90'))->assertCreated();
        $payment = ['id' => (string) Str::uuid(), 'senderId' => $b, 'recipientId' => $a, 'currency' => 'JPY', 'amountMinor' => '3000', 'paidCurrency' => 'SGD', 'paidAmountMinor' => '3000', 'date' => '2026-11-15'];
        $this->postJson("/api/trips/$trip->id/expense-payments", $payment)->assertCreated();
        $this->postJson("/api/trips/$trip->id/expense-payments", $payment)->assertOk();
        $snapshot = $this->getJson("/api/trips/$trip->id")->json('expenseLedger');
        $jpy = collect($snapshot['currencies'])->firstWhere('currency', 'JPY');
        $sgd = collect($snapshot['currencies'])->firstWhere('currency', 'SGD');
        $this->assertSame('0', collect($jpy['balances'])->firstWhere('participantId', $b)['amountMinor']);
        $this->assertSame('-3000', collect($sgd['balances'])->firstWhere('participantId', $b)['amountMinor']);
        $this->assertSame('SGD', $snapshot['payments'][0]['paidCurrency']);
        $this->assertSame('3000', $snapshot['payments'][0]['paidAmountMinor']);
        $this->postJson("/api/trips/$trip->id/expense-payments", [...$payment, 'id' => (string) Str::uuid(), 'paidAmountMinor' => '0'])->assertUnprocessable();
        $this->deleteJson("/api/trips/$trip->id/expense-payments/{$payment['id']}")->assertOk();
        $history = $this->getJson("/api/trips/$trip->id/expense-history")->assertOk()->json('items');
        $this->assertSame('payment.void', $history[0]['operation']);
        $this->assertStringContainsString('SGD 30.00', $history[0]['changes'][0]['after']);
    }

    public function test_archiving_and_renaming_people_preserves_balances_and_history_respects_visibility(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c))->assertCreated();
        $this->patchJson("/api/trips/$trip->id/expense-participants/$b", ['name' => 'Beatrice', 'archived' => true])->assertOk();
        $snapshot = $this->getJson("/api/trips/$trip->id")->json('expenseLedger');
        $this->assertSame('Beatrice', collect($snapshot['participants'])->firstWhere('id', $b)['name']);
        $this->assertTrue(collect($snapshot['participants'])->firstWhere('id', $b)['archived']);
        $this->assertSame('-3000', collect($snapshot['currencies'][0]['balances'])->firstWhere('participantId', $b)['amountMinor']);
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c))->assertUnprocessable();
        $this->patchJson("/api/trips/$trip->id/expense-participants/$b", ['archived' => false])->assertOk();
        $this->postJson("/api/trips/$trip->id/expenses", $this->expense($a, $b, $c))->assertCreated();
        $this->getJson("/api/trips/$trip->id/expense-history")->assertOk()->assertJsonStructure(['items' => [['operation', 'changes']], 'nextCursor']);
        $trip->update(['sharing_level' => 2, 'viewer_show_expenses' => false]);
        $viewer = User::create(['id' => (string) Str::uuid(), 'handle' => 'guest-viewer']);
        $trip->users()->attach($viewer->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $this->actingAs($viewer)->getJson("/api/trips/$trip->id/expense-history")->assertOk()->assertJsonPath('items', []);
        $this->patchJson("/api/trips/$trip->id/expense-participants/$b", ['archived' => true])->assertForbidden();
    }

    public function test_expense_deletion_rejects_stale_confirmation_and_retains_payment_history(): void
    {
        [$trip, , $a, $b, $c] = $this->setupTrip();
        $data = $this->expense($a, $b, $c);
        $this->postJson("/api/trips/$trip->id/expenses", $data)->assertCreated();
        $this->deleteJson("/api/expenses/{$data['id']}?expectedRevision=0")->assertConflict();
        $this->getJson("/api/trips/$trip->id")->assertJsonPath('expenseLedger.splitCount', 1);
        $this->deleteJson("/api/expenses/{$data['id']}?expectedRevision=1")->assertOk();
        $this->getJson("/api/trips/$trip->id")->assertJsonPath('expenseLedger.splitCount', 0);
        $this->getJson("/api/trips/$trip->id/expense-history")->assertOk()->assertJsonPath('items.0.operation', 'expense.delete');
    }
}
