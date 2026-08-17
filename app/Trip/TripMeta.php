<?php

declare(strict_types=1);

namespace App\Trip;

/**
 * Normalized, validated metadata for a single public trip.
 */
final readonly class TripMeta
{
    public function __construct(
        public string $id,
        public string $title,
        public int $timestampStart,
        public int $timestampEnd,
        public string $timeZone,
        public ?string $ownerHandle,
        public int $activityCount,
    ) {
    }
}