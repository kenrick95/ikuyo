<?php

namespace App\Http\Controllers\Api;

use App\Models\Trip;
use Illuminate\Http\JsonResponse;

class MetadataController
{
    public function trip(Trip $trip): JsonResponse
    {
        // This endpoint is intentionally public only for public trips. Never expose
        // private titles/dates through an admin-style metadata lookup.
        abort_unless($trip->sharing_level >= 2, 404);

        $trip->loadCount('activities');
        $owner = $trip->users()->wherePivot('role', 0)->first();

        return response()->json([
            'id' => $trip->id,
            'title' => $trip->title,
            'timestampStart' => $trip->timestamp_start_ms,
            'timestampEnd' => $trip->timestamp_end_ms,
            'timeZone' => $trip->timezone,
            'ownerHandle' => $owner?->handle,
            'activityCount' => $trip->activities_count,
            'sharingLevel' => $trip->sharing_level,
        ])->header('Cache-Control', 'no-store');
    }
}
