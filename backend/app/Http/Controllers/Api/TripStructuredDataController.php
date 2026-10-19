<?php

namespace App\Http\Controllers\Api;

use App\Models\Trip;
use App\Services\TripStructuredData;
use Illuminate\Http\JsonResponse;

class TripStructuredDataController
{
    public function __invoke(Trip $trip, TripStructuredData $structuredData): JsonResponse
    {
        return response()->json($structuredData->forTrip($trip))
            ->header('Content-Type', 'application/ld+json')
            ->header('Content-Disposition', 'attachment; filename="ikuyo-trip.jsonld"')
            ->header('Cache-Control', 'no-store');
    }
}
