<?php

declare(strict_types=1);

namespace App\Trip;

/**
 * The trip's sharing level.
 *
 * Values are shared with the frontend (`src/Trip/tripSharingLevel.ts`):
 * 0 = private, 2 = public unlisted, 3 = public listed.
 */
enum SharingLevel: int
{
    case Private = 0;
    case PublicUnlisted = 2;
    case PublicListed = 3;

    /** Link-shareable (viewable by anyone) levels. */
    public function isShareable(): bool
    {
        return $this->value >= self::PublicUnlisted->value;
    }

    public static function fromInt(int $value): self
    {
        return self::tryFrom($value) ?? self::Private;
    }
}