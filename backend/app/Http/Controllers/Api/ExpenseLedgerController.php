<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Services\ExpenseLedgerService;
use App\Services\ExpenseMoney;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseLedgerController extends Controller
{
    public function storePayment(Request $request, Trip $trip, ExpenseLedgerService $ledger): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'max:40'],
            'senderId' => ['required', 'string', 'different:recipientId'],
            'recipientId' => ['required', 'string'],
            'currency' => ['required', 'string', 'size:3'],
            'amountMinor' => ['required', 'string', 'regex:/^\d+$/D', 'max:13'],
            'paidCurrency' => ['required_with:paidAmountMinor', 'string', 'size:3'],
            'paidAmountMinor' => ['required_with:paidCurrency', 'string', 'regex:/^\d+$/D', 'max:13'],
            'date' => ['required', 'date_format:Y-m-d'],
            'note' => ['sometimes', 'string', 'max:500'],
        ]);
        ExpenseMoney::exponent($data['currency']);
        $amount = ExpenseMoney::scaled($data['amountMinor'], 0, ExpenseMoney::MAX_MINOR);
        abort_if($amount === 0, 422, 'Amount must be greater than zero.');
        $paidCurrency = $data['paidCurrency'] ?? $data['currency'];
        ExpenseMoney::exponent($paidCurrency);
        $paidAmount = isset($data['paidAmountMinor']) ? ExpenseMoney::scaled($data['paidAmountMinor'], 0, ExpenseMoney::MAX_MINOR) : $amount;
        abort_if($paidAmount === 0, 422, 'Payment amount must be greater than zero.');
        abort_if($paidCurrency === $data['currency'] && $paidAmount !== $amount, 422, 'Amounts in the same currency must match.');
        $count = DB::table('trip_people')->where('trip_id', $trip->id)->whereIn('id', [$data['senderId'], $data['recipientId']])->count();
        abort_unless($count === 2, 422, 'People must belong to this trip.');
        $row = [
            'id' => $data['id'], 'trip_id' => $trip->id,
            'sender_id' => $data['senderId'], 'recipient_id' => $data['recipientId'],
            'currency' => $data['currency'], 'amount_minor' => $amount,
            'paid_currency' => $paidCurrency, 'paid_amount_minor' => $paidAmount,
            'paid_on' => $data['date'], 'note' => $data['note'] ?? '',
        ];
        $existing = DB::table('expense_payments')->where('id', $data['id'])->first();
        if ($existing) {
            foreach ($row as $key => $value) {
                abort_unless((string) $existing->$key === (string) $value, 409, 'Payment ID already used with different details.');
            }

            return response()->json(['id' => $existing->id]);
        }
        DB::table('expense_payments')->insert([...$row, 'created_at_ms' => now()->getTimestampMs()]);
        $ledger->history($trip, $row['id'], 'payment.create', null, $row, $request->user());
        $ledger->notify($trip);

        return response()->json(['id' => $row['id']], 201);
    }

    public function voidPayment(Request $request, Trip $trip, string $payment, ExpenseLedgerService $ledger): JsonResponse
    {
        $row = DB::table('expense_payments')->where('trip_id', $trip->id)->where('id', $payment)->first();
        abort_unless($row !== null, 404);
        if ($row->voided_at_ms === null) {
            DB::table('expense_payments')->where('id', $payment)->update(['voided_at_ms' => now()->getTimestampMs()]);
            $ledger->history($trip, $payment, 'payment.void', (array) $row, null, $request->user());
            $ledger->notify($trip);
        }

        return response()->json(['ok' => true]);
    }

    public function history(Request $request, Trip $trip, TripAccessService $access): JsonResponse
    {
        $role = $access->role($trip, $request->user());
        if (! $request->user()?->isAdmin() && (($role === null && $trip->public_show_expenses === false) || ($role === 2 && $trip->viewer_show_expenses === false))) {
            return response()->json(['items' => [], 'nextCursor' => null]);
        }
        $data = $request->validate(['cursor' => ['sometimes', 'integer', 'min:1']]);
        $rows = DB::table('expense_history')->where('trip_id', $trip->id)
            ->when(isset($data['cursor']), fn ($q) => $q->where('id', '<', $data['cursor']))->orderByDesc('id')->limit(51)->get();
        $people = DB::table('trip_people')->where('trip_id', $trip->id)->pluck('name', 'id');
        $items = $rows->take(50)->map(function ($row) use ($people): array {
            $before = $row->before ? json_decode($row->before, true, flags: JSON_THROW_ON_ERROR) : [];
            $after = $row->after ? json_decode($row->after, true, flags: JSON_THROW_ON_ERROR) : [];
            $changes = [];
            foreach (str_starts_with($row->operation, 'payment.') ? [] : ['title', 'amount', 'currency', 'name', 'archived', 'isParticipant'] as $field) {
                if (($before[$field] ?? null) !== ($after[$field] ?? null)) {
                    $changes[] = ['field' => $field, 'before' => (string) ($before[$field] ?? ''), 'after' => (string) ($after[$field] ?? '')];
                }
            }
            foreach (['contributions' => 'Paid by', 'allocations' => 'Shares'] as $key => $label) {
                $describe = fn ($payload) => implode(', ', array_map(fn ($r) => ($people[$r['participantId']] ?? 'Person') . ': ' . ExpenseMoney::format((int) $r['amountMinor'], $payload['currency']), $payload['ledger'][$key] ?? []));
                if ($describe($before) !== $describe($after)) {
                    $changes[] = ['field' => $label, 'before' => $describe($before), 'after' => $describe($after)];
                }
            }
            if (str_starts_with($row->operation, 'payment.')) {
                $payment = $after ?: $before;
                $changes[] = ['field' => 'Payment', 'before' => '', 'after' => ($people[$payment['sender_id']] ?? 'Person') . ' → ' . ($people[$payment['recipient_id']] ?? 'Person') . ' · ' . ExpenseMoney::format((int) ($payment['paid_amount_minor'] ?? $payment['amount_minor']), $payment['paid_currency'] ?? $payment['currency'])];
            }

            return ['id' => $row->id, 'entityId' => $row->entity_id, 'operation' => $row->operation, 'createdAt' => $row->created_at_ms, 'changes' => $changes];
        })->all();

        return response()->json(['items' => $items, 'nextCursor' => $rows->count() > 50 ? $rows[49]->id : null]);
    }
}
