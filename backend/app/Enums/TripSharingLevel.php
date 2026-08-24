<?php

namespace App\Enums;

/**
 * Trip sharing level stored as integer on trips.sharing_level.
 * 0 private, 2 public-unlisted, 3 public-listed.
 */
enum TripSharingLevel: int
{
    case Private = 0;
    case PublicUnlisted = 2;
    case PublicListed = 3;

    public function isPublic(): bool
    {
        return $this === self::PublicUnlisted || $this === self::PublicListed;
    }
}
