<?php

declare(strict_types=1);

namespace App\Trip;

use App\Config\Settings;
use App\Http\InstantApi;

/**
 * Fetches trip data via the InstantDB admin API and builds a {@see TripMeta}.
 *
 * The admin API bypasses permission checks, so this class is the gateway that
 * enforces the "public only" rule: a private/missing trip yields `null`.
 */
final class PublicTrip
{
    private readonly InstantApi $api;

    public function __construct(private readonly Settings $settings)
    {
        $this->api = new InstantApi(
            $settings->adminQueryUri(),
            $settings->appId(),
            $settings->adminToken(),
        );
    }

    public function find(string $tripId): ?TripMeta
    {
        $result = $this->api->query([
            'trip' => [
                '$' => (object) ['where' => ['id' => $tripId]],
                'tripUser' => [
                    '$' => (object) ['where' => ['role' => 'owner']],
                    'user' => (object) [],
                ],
                'activity' => (object) [],
            ],
        ]);
        if ($result === null) {
            return null;
        }

        $trip = $result['trip'][0] ?? null;
        if (!is_array($trip) || !SharingLevel::fromInt((int) ($trip['sharingLevel'] ?? 0))->isShareable()) {
            return null;
        }

        return new TripMeta(
            id: (string) $trip['id'],
            title: (string) ($trip['title'] ?? ''),
            timestampStart: (int) ($trip['timestampStart'] ?? 0),
            timestampEnd: (int) ($trip['timestampEnd'] ?? 0),
            timeZone: (string) ($trip['timeZone'] ?? 'UTC'),
            ownerHandle: $this->ownerHandle($trip),
            activityCount: is_array($trip['activity'] ?? null) ? count($trip['activity']) : 0,
        );
    }

    private function ownerHandle(array $trip): ?string
    {
        foreach ($trip['tripUser'] ?? [] as $tu) {
            if (!is_array($tu)) {
                continue;
            }
            $firstUser = $tu['user'][0] ?? null;
            $handle = is_array($firstUser) ? ($firstUser['handle'] ?? '') : '';
            if ($handle !== '') {
                return (string) $handle;
            }
        }
        return null;
    }
}