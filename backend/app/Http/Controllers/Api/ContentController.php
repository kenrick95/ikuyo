<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Trip;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    public function activityDestroy(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        $activity->delete();
        return response()->json(['ok' => true]);
    }

    public function activityUpdate(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        $activity->fill($this->mapFields($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms'])));
        $activity->save();
        return response()->json($activity->fresh());
    }

    public function byIdUpdate(Request $request, string $entity, string $entityId, TripAccessService $access): JsonResponse
    {
        $record = $this->recordById($entity, $entityId);
        abort_unless($request->user() && $access->canEdit($record->trip, $request->user()), 403);
        $record->fill($this->mapFields($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms'])));
        $record->save();
        return response()->json($record->fresh());
    }

    public function byIdDestroy(Request $request, string $entity, string $entityId, TripAccessService $access): JsonResponse
    {
        $record = $this->recordById($entity, $entityId);
        abort_unless($request->user() && $access->canEdit($record->trip, $request->user()), 403);
        $record->delete();
        return response()->json(['ok' => true]);
    }
    private const MODELS = [
        'activities' => Activity::class,
        'accommodations' => Accommodation::class,
        'macroplans' => MacroPlan::class,
        'expenses' => Expense::class,
    ];

    private const RELATIONS = [
        'activities' => 'activities',
        'accommodations' => 'accommodations',
        'macroplans' => 'macroPlans',
        'expenses' => 'expenses',
    ];

    public function index(Trip $trip, string $entity): JsonResponse
    {
        $this->model($entity);
        return response()->json($trip->getRelationValue(self::RELATIONS[$entity]));
    }

    public function store(Request $request, Trip $trip, string $entity): JsonResponse
    {
        $model = $this->model($entity);
        $data = $this->mapFields($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms']));
        $record = new $model($data);
        $record->id = (string) Str::uuid();
        $record->trip_id = $trip->id;
        $record->save();
        return response()->json($record->fresh(), 201);
    }

    public function update(Request $request, Trip $trip, string $entity, string $entityId): JsonResponse
    {
        $record = $this->record($trip, $entity, $entityId);
        $record->fill($this->mapFields($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms'])));
        $record->save();
        return response()->json($record->fresh());
    }

    public function destroy(Trip $trip, string $entity, string $entityId): JsonResponse
    {
        $this->record($trip, $entity, $entityId)->delete();
        return response()->json(['ok' => true]);
    }

    public function activityDragEnd(Request $request, Trip $trip, string $activity): JsonResponse
    {
        $record = $trip->activities()->whereKey($activity)->firstOrFail();
        $data = $request->validate(['timestampStart' => ['nullable', 'integer'], 'timestampEnd' => ['nullable', 'integer']]);
        $record->update(['timestamp_start_ms' => $data['timestampStart'] ?? null, 'timestamp_end_ms' => $data['timestampEnd'] ?? null, 'flags' => ((int) $record->flags) & ~1]);
        return response()->json($record->fresh());
    }

    public function activityDuplicate(Request $request, Trip $trip, string $activity): JsonResponse
    {
        $record = $trip->activities()->whereKey($activity)->firstOrFail();
        $data = $request->validate(['timestampStart' => ['nullable', 'integer'], 'timestampEnd' => ['nullable', 'integer']]);
        $copy = $record->replicate();
        $copy->id = (string) Str::uuid();
        $copy->trip_id = $trip->id;
        $copy->timestamp_start_ms = $data['timestampStart'] ?? null;
        $copy->timestamp_end_ms = $data['timestampEnd'] ?? null;
        $copy->flags = ((int) $record->flags) & ~1;
        $copy->save();
        return response()->json(['id' => $copy->id], 201);
    }

    private function mapFields(array $data): array
    {
        $map = [
            'timestampStart' => 'timestamp_start_ms', 'timestampEnd' => 'timestamp_end_ms',
            'timeZoneStart' => 'timezone_start', 'timeZoneEnd' => 'timezone_end',
            'locationLat' => 'location_lat', 'locationLng' => 'location_lng', 'locationZoom' => 'location_zoom',
            'locationDestination' => 'location_destination', 'locationDestinationLat' => 'location_destination_lat',
            'locationDestinationLng' => 'location_destination_lng', 'locationDestinationZoom' => 'location_destination_zoom',
            'timestampCheckIn' => 'check_in_ms', 'timestampCheckOut' => 'check_out_ms',
            'timeZoneCheckIn' => 'tz_check_in', 'timeZoneCheckOut' => 'tz_check_out',
            'phoneNumber' => 'phone_number', 'amountInOriginCurrency' => 'amount_in_origin_currency',
            'currencyConversionFactor' => 'currency_conversion_factor', 'timestampIncurred' => 'incurred_at_ms',
            'timeZoneIncurred' => 'timezone_incurred',
        ];
        foreach ($map as $from => $to) {
            if (array_key_exists($from, $data)) { $data[$to] = $data[$from]; unset($data[$from]); }
        }
        return $data;
    }

    private function recordById(string $entity, string $id): Activity|Accommodation|MacroPlan|Expense
    {
        $model = $this->model($entity);
        return $model::with('trip')->whereKey($id)->firstOrFail();
    }

    private function model(string $entity): string
    {
        abort_unless(isset(self::MODELS[$entity]), 404, 'Unknown content type.');
        return self::MODELS[$entity];
    }

    private function record(Trip $trip, string $entity, string $id): Activity|Accommodation|MacroPlan|Expense
    {
        $model = $this->model($entity);
        return $trip->getRelationValue(self::RELATIONS[$entity])->whereKey($id)->firstOrFail();
    }
}