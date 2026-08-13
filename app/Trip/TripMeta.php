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

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'timestampStart' => $this->timestampStart,
            'timestampEnd' => $this->timestampEnd,
            'timeZone' => $this->timeZone,
            'ownerHandle' => $this->ownerHandle,
            'activityCount' => $this->activityCount,
        ];
    }
}