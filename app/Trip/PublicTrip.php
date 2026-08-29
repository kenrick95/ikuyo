<?php

declare(strict_types=1);

namespace App\Trip;

use App\Config\Settings;
use App\Http\LaravelApi;

/**
 * Fetches public trip data from Laravel and builds a {@see TripMeta}.
 */
final class PublicTrip
{
    public function __construct(private readonly Settings $settings)
    {}

    public function find(string $tripId): ?TripMeta
    {
        if ($this->settings->laravelApiUrl() === '') return null;
        return $this->findViaLaravel($tripId);
    }

    private function findViaLaravel(string $tripId): ?TripMeta
    {
        $api = new LaravelApi($this->settings->laravelApiUrl());
        $data = $api->tripMeta($tripId);
        if ($data === null) return null;
        // The Laravel endpoint only exposes public trips.
        return new TripMeta(
            id: (string) ($data['id'] ?? $tripId),
            title: (string) ($data['title'] ?? ''),
            timestampStart: (int) ($data['timestampStart'] ?? 0),
            timestampEnd: (int) ($data['timestampEnd'] ?? 0),
            timeZone: (string) ($data['timeZone'] ?? 'UTC'),
            ownerHandle: isset($data['ownerHandle']) ? (string) $data['ownerHandle'] : null,
            activityCount: (int) ($data['activityCount'] ?? 0),
        );
    }

}
