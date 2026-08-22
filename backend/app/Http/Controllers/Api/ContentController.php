<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Trip;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ContentController extends Controller
{
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
        $data = $request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms']);
        $record = new $model($data);
        $record->id = (string) Str::uuid();
        $record->trip_id = $trip->id;
        $record->save();
        return response()->json($record->fresh(), 201);
    }

    public function update(Request $request, Trip $trip, string $entity, string $entityId): JsonResponse
    {
        $record = $this->record($trip, $entity, $entityId);
        $record->fill($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms']));
        $record->save();
        return response()->json($record->fresh());
    }

    public function destroy(Trip $trip, string $entity, string $entityId): JsonResponse
    {
        $this->record($trip, $entity, $entityId)->delete();
        return response()->json(['ok' => true]);
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