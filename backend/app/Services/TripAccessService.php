<?php

namespace App\Services;

use App\Models\Trip;
use App\Models\User;

class TripAccessService
{
    public function role(Trip $trip, ?User $user): ?int
    {
        if (! $user) {
            return null;
        }

        $member = $trip->users()->whereKey($user->getKey())->first();

        return $member?->pivot?->role;
    }

    public function canView(Trip $trip, ?User $user): bool
    {
        return $trip->sharing_level >= 2 || $this->role($trip, $user) !== null;
    }

    public function canEdit(Trip $trip, ?User $user): bool
    {
        return in_array($this->role($trip, $user), [0, 1], true);
    }

    public function canManage(Trip $trip, ?User $user): bool
    {
        return $this->role($trip, $user) === 0;
    }

    public function ensureContentWritable(Trip $trip): void
    {
        abort_if($trip->archived_at_ms !== null, 409, 'Archived trips are read-only.');
    }
}
