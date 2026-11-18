<?php

namespace App\Services;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TripPeopleService
{
    public function person(Trip $trip, ?User $user, string $name, ?string $id = null, bool $isParticipant = true): string
    {
        if ($user) {
            $existing = DB::table('trip_people')->where('trip_id', $trip->id)->where('user_id', $user->id)->value('id');
            if ($existing) {
                return $existing;
            }
        }
        $id ??= (string) Str::uuid();
        $existing = DB::table('trip_people')->where('id', $id)->first();
        if ($existing) {
            abort_unless($existing->trip_id === $trip->id && $existing->name === $name && $existing->user_id === $user?->id && (bool) $existing->is_participant === $isParticipant, 409, 'Person ID already used.');

            return $id;
        }
        DB::table('trip_people')->insert([
            'id' => $id, 'trip_id' => $trip->id, 'user_id' => $user?->id,
            'name' => $name, 'is_participant' => $isParticipant, 'created_at_ms' => now()->getTimestampMs(),
        ]);

        return $id;
    }

    /** @return list<array<string, mixed>> */
    public function snapshot(Trip $trip, bool $includeAccounts = false, bool $includeNonParticipants = true): array
    {
        return DB::table('trip_people as p')->leftJoin('users as u', 'p.user_id', '=', 'u.id')
            ->leftJoin('trip_user as m', fn ($join) => $join->on('m.trip_id', '=', 'p.trip_id')->on('m.user_id', '=', 'p.user_id'))
            ->where('p.trip_id', $trip->id)
            ->when(! $includeNonParticipants, fn ($q) => $q->where('p.is_participant', true)->whereNull('p.archived_at_ms'))
            ->orderBy('p.created_at_ms')->orderBy('p.id')
            ->get(['p.id', 'p.name', 'p.user_id', 'p.is_participant', 'p.archived_at_ms', 'u.handle', 'u.email', 'u.deleted_at', 'm.role'])->map(function ($p) use ($includeAccounts): array {
                $linked = $p->user_id !== null && $p->deleted_at === null;

                return [
                    'id' => $p->id, 'name' => $p->name, 'isParticipant' => (bool) $p->is_participant,
                    'hasAccount' => $linked,
                    'accountType' => $includeAccounts && $linked ? ($p->email === null ? 'guest' : 'registered') : null,
                    'userId' => $includeAccounts && $linked ? $p->user_id : null,
                    'handle' => $includeAccounts && $linked ? $p->handle : null,
                    'accessRole' => $includeAccounts && $linked && $p->role !== null ? (int) $p->role : null,
                    'archived' => $p->archived_at_ms !== null,
                ];
            })->all();
    }

    public function notify(Trip $trip): void
    {
        app(SyncEventService::class)->record('trip_people', $trip->id, 'upsert', $trip->id);
    }
}
