<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExpenseLedgerService
{
    public function write(Request $request, Trip $trip, ?Expense $expense = null): Expense
    {
        return DB::transaction(function () use ($request, $trip, $expense): Expense {
            $validated = $request->validate([
                'id' => ['sometimes', 'string', 'max:40'],
                'title' => [$expense ? 'sometimes' : 'required', 'string', 'max:255'],
                'description' => ['sometimes', 'nullable', 'string'],
                'amount' => [$expense ? 'sometimes' : 'required', 'numeric'],
                'currency' => [$expense ? 'sometimes' : 'required', 'string', 'max:8'],
                'timestampIncurred' => [$expense ? 'sometimes' : 'required', 'integer'],
                'timeZoneIncurred' => ['sometimes', 'nullable', 'timezone'],
                'currencyConversionFactor' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
                'amountInOriginCurrency' => ['sometimes', 'nullable', 'numeric'],
                'ledger' => ['sometimes', 'nullable', 'array'],
                'expectedRevision' => ['sometimes', 'integer', 'min:0'],
            ]);
            $creating = ! $expense;
            if ($creating) {
                $id = $validated['id'] ?? (string) Str::uuid();
                // The client can resolve `me` after a lost response and a sync.
                // Use the same identity for both forms of a creation retry.
                $fingerprint = $validated;
                $selfId = DB::table('trip_people')->where('trip_id', $trip->id)->where('user_id', $request->user()->id)->value('id');
                if (isset($fingerprint['ledger'])) {
                    if (($fingerprint['ledger']['paidBy'] ?? null) === $selfId) {
                        $fingerprint['ledger']['paidBy'] = 'me';
                    }
                    foreach (['shares', 'contributions'] as $key) {
                        foreach ($fingerprint['ledger'][$key] ?? [] as $i => $row) {
                            if (($row['participantId'] ?? null) === $selfId) {
                                $fingerprint['ledger'][$key][$i]['participantId'] = 'me';
                            }
                        }
                    }
                }
                $hash = hash('sha256', json_encode([$request->user()->id, $fingerprint], JSON_THROW_ON_ERROR));
                $existing = Expense::withTrashed()->whereKey($id)->first();
                if ($existing) {
                    abort_unless(! $existing->trashed() && $existing->trip_id === $trip->id && $existing->creation_hash === $hash, 409, 'Expense ID already used with different details.');

                    return $existing;
                }
                $expense = new Expense(['id' => $id, 'trip_id' => $trip->id, 'creation_hash' => $hash]);
            }
            $before = $expense->toArray();
            $hasLedger = array_key_exists('ledger', $validated);
            if ($expense->ledger || $hasLedger) {
                if (! $creating) {
                    abort_unless($request->input('expectedRevision') === (int) $expense->ledger_revision, 409, 'Expense changed. Reload before saving.');
                }
                if (! $hasLedger && ($request->has('amount') || $request->has('currency'))) {
                    abort(409, 'Include the current split when changing an allocated expense.');
                }
            }
            $map = ['timestampIncurred' => 'incurred_at_ms', 'timeZoneIncurred' => 'timezone_incurred', 'currencyConversionFactor' => 'currency_conversion_factor', 'amountInOriginCurrency' => 'amount_in_origin_currency'];
            foreach (['title', 'description', 'amount', 'currency', ...array_keys($map)] as $key) {
                if (array_key_exists($key, $validated)) {
                    $expense->setAttribute($map[$key] ?? $key, $validated[$key]);
                }
            }
            if ($hasLedger) {
                $expense->ledger = $validated['ledger'] === null ? null : $this->validateLedger($request, $trip, $expense);
            }
            $this->assertRefundsFit($trip, $expense);
            $expense->ledger_revision = ((int) $expense->ledger_revision) + 1;
            $expense->save();
            $this->history($trip, $expense->id, 'expense.save', $before, $expense->toArray(), $request->user());

            return $expense->fresh();
        });
    }

    public function assertRestorable(Trip $trip, Expense $expense): void
    {
        if ($expense->ledger) {
            if (($expense->ledger['kind'] ?? 'expense') === 'refund') {
                abort_unless($trip->expenses()->whereKey($expense->ledger['refundOf'])->exists(), 422, 'Restore the original expense before restoring its refund.');
            }
            $request = new Request(['ledger' => $expense->ledger]);
            $request->setUserResolver(fn () => request()->user());
            $this->validateLedger($request, $trip, $expense);
        }
        $this->assertRefundsFit($trip, $expense);
    }

    public function assertDeletable(Trip $trip, Expense $expense): void
    {
        abort_if($trip->expenses()->where('ledger->refundOf', $expense->id)->exists(), 422, 'Delete the refunds before deleting their original expense.');
    }

    private function assertRefundsFit(Trip $trip, Expense $expense): void
    {
        // Corrections and restoration must preserve the ceiling for active refunds.
        $refunds = $trip->expenses()->where('ledger->refundOf', $expense->id)->get();
        $refunded = 0;
        foreach ($refunds as $refund) {
            abort_unless($expense->currency === $refund->currency && ($expense->ledger['kind'] ?? 'expense') === 'expense' && ($expense->ledger['method'] ?? null), 422, 'Keep the original currency and split while refunds exist.');
            $refunded += ExpenseMoney::minor((string) $refund->amount, $refund->currency);
        }
        if ($refunds->isNotEmpty()) {
            abort_if($refunded > ExpenseMoney::minor((string) $expense->amount, $expense->currency), 422, 'Amount cannot be less than its recorded refunds.');
        }
    }

    /** @return array<string, mixed> */
    private function validateLedger(Request $request, Trip $trip, Expense $expense): array
    {
        $data = $request->validate([
            'ledger.paidBy' => ['required', 'string', 'max:40'],
            'ledger.method' => ['nullable', 'in:equal,exact,percent,shares'],
            'ledger.kind' => ['sometimes', 'in:expense,refund'],
            'ledger.refundOf' => ['required_if:ledger.kind,refund', 'nullable', 'string', 'max:40'],
            ...($request->input('ledger.method') ? [
                'ledger.shares' => ['required', 'array', 'max:100'],
                'ledger.shares.*.participantId' => ['required', 'string', 'distinct'],
                'ledger.shares.*.value' => ['sometimes', 'string', 'max:30'],
            ] : []),
            ...($request->input('ledger.paidBy') === 'multiple' ? [
                'ledger.contributions' => ['required', 'array', 'min:1', 'max:100'],
                'ledger.contributions.*.participantId' => ['required', 'string', 'distinct'],
                'ledger.contributions.*.amountMinor' => ['required', 'string', 'regex:/^\d+$/D', 'max:13'],
            ] : []),
        ])['ledger'];
        if (! ($data['method'] ?? null)) {
            $data['shares'] = [];
        }
        if ($data['paidBy'] !== 'multiple') {
            unset($data['contributions']);
        }
        $payer = $data['paidBy'];
        if ($payer === 'me') {
            $payer = app(TripPeopleService::class)->person($trip, $request->user(), $request->user()->handle, null, false);
        }
        $needsSelf = collect([...($data['shares'] ?? []), ...($data['contributions'] ?? [])])->contains('participantId', 'me');
        if ($needsSelf) {
            $selfId = app(TripPeopleService::class)->person($trip, $request->user(), $request->user()->handle, null, false);
            foreach (['shares', 'contributions'] as $key) {
                foreach ($data[$key] ?? [] as $i => $row) {
                    if ($row['participantId'] === 'me') {
                        $data[$key][$i]['participantId'] = $selfId;
                    }
                }
                $resolved = array_column($data[$key] ?? [], 'participantId');
                if (count($resolved) !== count(array_unique($resolved))) {
                    ExpenseMoney::invalid('Choose each person only once.');
                }
            }
        }
        $participants = DB::table('trip_people')->where('trip_id', $trip->id)->get()->keyBy('id');
        $ids = $participants->keys()->all();
        $total = ExpenseMoney::minor((string) $expense->amount, $expense->currency);
        if ($total <= 0) {
            ExpenseMoney::invalid('Amount must be greater than zero.');
        }
        $method = $data['method'] ?? null;
        $kind = $data['kind'] ?? 'expense';
        if ($kind === 'refund') {
            $original = $trip->expenses()->withTrashed()->whereKey($data['refundOf'])->first();
            abort_unless($original && $original->id !== $expense->id && ($original->ledger['kind'] ?? 'expense') === 'expense' && ($original->ledger['method'] ?? null) && $original->currency === $expense->currency && $method, 422, 'Choose an original split expense in the same currency.');
            abort_if($original->trashed() && ! $expense->exists, 422, 'Restore the original expense before adding a refund.');
            $refunded = 0;
            foreach ($trip->expenses()->where('id', '!=', $expense->id)->where('ledger->refundOf', $original->id)->get() as $refund) {
                $refunded += ExpenseMoney::minor((string) $refund->amount, $refund->currency);
            }
            abort_if($refunded + $total > ExpenseMoney::minor((string) $original->amount, $original->currency), 422, 'Refunds cannot exceed the original expense.');
        }
        $shares = $data['shares'] ?? [];
        $contributions = $payer === 'multiple' ? $data['contributions'] : [['participantId' => $payer, 'amountMinor' => (string) $total]];
        foreach ([...$shares, ...$contributions] as $row) {
            if (! in_array($row['participantId'], $ids, true)) {
                ExpenseMoney::invalid('People must belong to this trip.');
            }
            $archived = $participants->get($row['participantId'])->archived_at_ms;
            $previousLedger = $kind === 'refund' ? $original->ledger : $expense->getOriginal('ledger');
            $previousIds = array_column([...($previousLedger['allocations'] ?? []), ...($previousLedger['contributions'] ?? [])], 'participantId');
            abort_if($archived !== null && ! in_array($row['participantId'], $previousIds, true), 422, 'Restore archived people before adding them to an expense.');
        }
        $paid = 0;
        foreach ($contributions as &$row) {
            $n = ExpenseMoney::scaled($row['amountMinor'], 0, ExpenseMoney::MAX_MINOR);
            $row['amountMinor'] = (string) $n;
            $paid += $n;
        }
        unset($row);
        if ($paid !== $total) {
            ExpenseMoney::invalid('Payer amounts must match the expense total.');
        }
        $weights = [];
        foreach ($shares as $row) {
            $weights[$row['participantId']] = match ($method) {
                'equal' => 1,
                'exact' => ExpenseMoney::minor($row['value'] ?? '0', $expense->currency),
                default => ExpenseMoney::scaled($row['value'] ?? '0', 4, 1_000_000),
            };
        }
        if (($method === 'exact' && array_sum($weights) !== $total) || ($method === 'percent' && array_sum($weights) !== 1_000_000)) {
            ExpenseMoney::invalid('Shares must add up to the total.');
        }
        $amounts = ! $method ? [] : ($method === 'exact' ? $weights : ExpenseMoney::allocate($total, $weights));

        return [
            'kind' => $kind, 'refundOf' => $kind === 'refund' ? $data['refundOf'] : null,
            'paidBy' => $payer, 'method' => $method, 'shares' => $method ? array_map(fn ($row) => array_intersect_key($row, array_flip(['participantId', 'value'])), $shares) : [],
            'contributions' => array_map(fn ($row) => array_intersect_key($row, array_flip(['participantId', 'amountMinor'])), $contributions),
            'allocations' => array_map(fn ($id, $n) => ['participantId' => $id, 'amountMinor' => (string) $n], array_keys($amounts), array_values($amounts)),
        ];
    }

    /** @return array<string, mixed> */
    public function snapshot(Trip $trip): array
    {
        return DB::transaction(function () use ($trip): array {
            // Writers take the trip's exclusive lock before changing any ledger
            // rows. Keep it stable across participants, expenses and payments.
            Trip::whereKey($trip->id)->sharedLock()->firstOrFail();

            return $this->buildSnapshot($trip);
        });
    }

    /** @return array<string, mixed> */
    private function buildSnapshot(Trip $trip): array
    {
        $balances = [];
        $add = function (string $currency, string $id, int $amount) use (&$balances): void {
            $balances[$currency][$id] = ($balances[$currency][$id] ?? 0) + $amount;
            abort_if(abs($balances[$currency][$id]) > 1_000_000_000_000_000, 422, 'Trip balance exceeds the supported range.');
        };
        $expenses = $trip->expenses()->get();
        $splitCount = 0;
        foreach ($expenses as $expense) {
            if (! ($expense->ledger['method'] ?? null)) {
                continue;
            }
            $splitCount++;
            $sign = ($expense->ledger['kind'] ?? 'expense') === 'refund' ? -1 : 1;
            foreach ($expense->ledger['contributions'] as $row) {
                $add($expense->currency, $row['participantId'], $sign * (int) $row['amountMinor']);
            }
            foreach ($expense->ledger['allocations'] as $row) {
                $add($expense->currency, $row['participantId'], -$sign * (int) $row['amountMinor']);
            }
        }
        $payments = DB::table('expense_payments')->where('trip_id', $trip->id)->orderBy('created_at_ms')->get();
        foreach ($payments as $payment) {
            if ($payment->voided_at_ms === null) {
                $add($payment->currency, $payment->sender_id, (int) $payment->amount_minor);
                $add($payment->currency, $payment->recipient_id, -((int) $payment->amount_minor));
            }
        }
        $currencies = [];
        ksort($balances);
        foreach ($balances as $currency => $nets) {
            ksort($nets, SORT_STRING);
            $debtors = $creditors = [];
            foreach ($nets as $id => $n) {
                if ($n < 0) {
                    $debtors[$id] = -$n;
                } elseif ($n > 0) {
                    $creditors[$id] = $n;
                }
            }
            $suggestions = [];
            foreach ($debtors as $sender => $owed) {
                foreach ($creditors as $recipient => &$credit) {
                    $n = min($owed, $credit);
                    if ($n > 0) {
                        $suggestions[] = ['senderId' => $sender, 'recipientId' => $recipient, 'amountMinor' => (string) $n];
                        $owed -= $n;
                        $credit -= $n;
                    }
                }
                unset($credit);
            }
            $currencies[] = ['currency' => $currency, 'balances' => array_map(fn ($id, $n) => ['participantId' => $id, 'amountMinor' => (string) $n], array_keys($nets), array_values($nets)), 'suggestions' => $suggestions];
        }

        return ['currencies' => $currencies, 'splitCount' => $splitCount, 'expenseCount' => $expenses->count(), 'payments' => $payments->map(fn ($p) => [
            'id' => $p->id, 'senderId' => $p->sender_id, 'recipientId' => $p->recipient_id,
            'currency' => $p->currency, 'amountMinor' => (string) $p->amount_minor,
            'paidCurrency' => $p->paid_currency, 'paidAmountMinor' => (string) $p->paid_amount_minor,
            'date' => $p->paid_on, 'note' => $p->note, 'voided' => $p->voided_at_ms !== null,
        ])->all()];
    }

    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function history(Trip $trip, string $id, string $operation, ?array $before, ?array $after, ?User $actor): void
    {
        DB::table('expense_history')->insert([
            'trip_id' => $trip->id, 'entity_id' => $id, 'operation' => $operation,
            'before' => $before === null ? null : json_encode($before, JSON_THROW_ON_ERROR),
            'after' => $after === null ? null : json_encode($after, JSON_THROW_ON_ERROR),
            'actor_id' => $actor?->id, 'created_at_ms' => now()->getTimestampMs(),
        ]);
    }

    public function notify(Trip $trip): void
    {
        // A payload-free expense event invalidates existing clients without exposing identities.
        app(SyncEventService::class)->record('expense_ledger', $trip->id, 'upsert', $trip->id);
    }
}
