<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trip;
use App\Models\User;
use App\Services\ExpenseLedgerService;
use App\Services\TripPeopleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TripPeopleController extends Controller
{
    public function lookup(Request $request, Trip $trip): JsonResponse
    {
        $data = $request->validate(['identity' => ['required', 'string', 'max:255']]);
        $identity = mb_strtolower(trim($data['identity']));
        $user = str_starts_with($identity, '@')
            ? User::whereRaw('LOWER(handle) = ?', [substr($identity, 1)])->first()
            : User::whereRaw('LOWER(email) = ?', [$identity])->first();

        return response()->json(['user' => $user ? ['id' => $user->id, 'handle' => $user->handle, 'accountType' => $user->email === null ? 'guest' : 'registered'] : null]);
    }

    public function store(Request $request, Trip $trip, TripPeopleService $people): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required', 'string', 'max:40'],
            'name' => ['required_without:userId', 'string', 'max:100'],
            'userId' => ['sometimes', 'nullable', 'string', 'max:40'],
            'isParticipant' => ['sometimes', 'boolean'],
        ]);
        $user = isset($data['userId']) ? User::findOrFail($data['userId']) : null;
        $name = trim($data['name'] ?? ($user ? $user->handle : ''));
        abort_if($name === '', 422, 'Enter a name.');
        $id = $people->person($trip, $user, $name, $data['id'], $data['isParticipant'] ?? true);
        app(ExpenseLedgerService::class)->history($trip, $id, 'person.add', null, ['name' => $name, 'isParticipant' => $data['isParticipant'] ?? true], $request->user());
        $people->notify($trip);

        return response()->json(['id' => $id], 201);
    }

    public function update(Request $request, Trip $trip, string $person, TripPeopleService $people): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:100'],
            'archived' => ['sometimes', 'boolean'], 'isParticipant' => ['sometimes', 'boolean'],
            'userId' => ['sometimes', 'nullable', 'string', 'max:40'],
        ]);
        $row = DB::table('trip_people')->where('trip_id', $trip->id)->where('id', $person)->first();
        abort_unless($row !== null, 404);
        $update = [];
        if (array_key_exists('userId', $data)) {
            $user = $data['userId'] === null ? null : User::findOrFail($data['userId']);
            abort_if($user && DB::table('trip_people')->where('trip_id', $trip->id)->where('user_id', $user->id)->where('id', '!=', $person)->exists(), 409, 'That account is already linked to another person in this trip.');
            $update['user_id'] = $user?->id;
        }
        if (isset($data['name'])) {
            $update['name'] = trim($data['name']);
            abort_if($update['name'] === '', 422, 'Enter a name.');
        }
        if (isset($data['isParticipant'])) {
            $update['is_participant'] = $data['isParticipant'];
        }
        if (isset($data['archived'])) {
            $update['archived_at_ms'] = $data['archived'] ? ($row->archived_at_ms ?? now()->getTimestampMs()) : null;
        }
        if ($update) {
            DB::table('trip_people')->where('id', $person)->update($update);
            app(ExpenseLedgerService::class)->history($trip, $person, 'person.update', ['name' => $row->name, 'archived' => $row->archived_at_ms !== null, 'isParticipant' => (bool) $row->is_participant], ['name' => $update['name'] ?? $row->name, 'archived' => array_key_exists('archived_at_ms', $update) ? $update['archived_at_ms'] !== null : $row->archived_at_ms !== null, 'isParticipant' => $update['is_participant'] ?? (bool) $row->is_participant], $request->user());
            $people->notify($trip);
        }

        return response()->json(['id' => $person]);
    }
}
