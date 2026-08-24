<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Trip;
use App\Services\TripAccessService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ContentController extends Controller
{
    public function activityDestroy(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        DB::transaction(function () use ($activity): void {
            $this->deleteRelatedComments('activity', $activity->id);
            $activity->delete();
        });
        return response()->json(['ok' => true]);
    }

    public function activityUpdate(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        $activity->fill($this->mapFields($request->except(['id', 'trip_id', 'created_at_ms', 'updated_at_ms'])));
        $activity->save();
        return response()->json($activity->fresh());
    }

    public function activityBatchUpdate(Request $request, Trip $trip, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($trip, $request->user()), 403);
        $updates = $request->validate([
            'activities' => ['required', 'array', 'max:1000'],
            'activities.*.id' => ['required', 'string'],
            'activities.*.timestampStart' => ['nullable', 'integer'],
            'activities.*.timestampEnd' => ['nullable', 'integer'],
        ])['activities'];
        DB::transaction(function () use ($trip, $updates): void {
            foreach ($updates as $update) {
                $activity = $trip->activities()->whereKey($update['id'])->firstOrFail();
                $activity->update([
                    'timestamp_start_ms' => $update['timestampStart'] ?? null,
                    'timestamp_end_ms' => $update['timestampEnd'] ?? null,
                ]);
            }
        });
        return response()->json(['ok' => true, 'movedCount' => count($updates)]);
    }

    public function activityDragEnd(Request $request, Trip $trip, string $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($trip, $request->user()), 403);
        $record = $trip->activities()->whereKey($activity)->firstOrFail();
        $data = $request->validate(['timestampStart' => ['nullable', 'integer'], 'timestampEnd' => ['nullable', 'integer']]);
        $record->update([
            'timestamp_start_ms' => $data['timestampStart'] ?? null,
            'timestamp_end_ms' => $data['timestampEnd'] ?? null,
            'flags' => ((int) $record->flags) & ~1,
        ]);
        return response()->json($record->fresh());
    }

    public function activityDuplicate(Request $request, Trip $trip, string $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($trip, $request->user()), 403);
        $record = $trip->activities()->whereKey($activity)->firstOrFail();
        $data = $request->validate([
            'timestampStart' => ['nullable', 'integer'],
            'timestampEnd' => ['nullable', 'integer'],
            'id' => ['nullable', 'string', 'max:40'],
        ]);
        $copy = $record->replicate();
        $copy->id = $data['id'] ?? (string) Str::uuid();
        $copy->trip_id = $trip->id;
        $copy->timestamp_start_ms = $data['timestampStart'] ?? null;
        $copy->timestamp_end_ms = $data['timestampEnd'] ?? null;
        $copy->flags = ((int) $record->flags) & ~1;
        $copy->save();
        return response()->json(['id' => $copy->id], 201);
    }

    public function activityDragEndById(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        $data = $request->validate(['timestampStart' => ['nullable', 'integer'], 'timestampEnd' => ['nullable', 'integer']]);
        $activity->update(['timestamp_start_ms' => $data['timestampStart'] ?? null, 'timestamp_end_ms' => $data['timestampEnd'] ?? null, 'flags' => ((int) $activity->flags) & ~1]);
        return response()->json($activity->fresh());
    }

    public function activityDuplicateById(Request $request, Activity $activity, TripAccessService $access): JsonResponse
    {
        abort_unless($request->user() && $access->canEdit($activity->trip, $request->user()), 403);
        $data = $request->validate([
            'timestampStart' => ['nullable', 'integer'],
            'timestampEnd' => ['nullable', 'integer'],
            'id' => ['nullable', 'string', 'max:40'],
        ]);
        $copy = $activity->replicate();
        $copy->id = $data['id'] ?? (string) Str::uuid();
        $copy->timestamp_start_ms = $data['timestampStart'] ?? null;
        $copy->timestamp_end_ms = $data['timestampEnd'] ?? null;
        $copy->flags = ((int) $activity->flags) & ~1;
        $copy->save();
        return response()->json(['id' => $copy->id], 201);
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
        $this->deleteEntityCommentGraph($record);
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

    public function index(Request $request, Trip $trip, string $entity, TripAccessService $access): JsonResponse
    {
        $this->model($entity);
        $role = $access->role($trip, $request->user());
        $isPublicVisitor = $role === null && $trip->sharing_level >= 2;

        // Apply same section visibility as the full-trip serializer so a caller cannot
        // bypass hidden expenses/tasks by hitting the child-collection endpoint directly.
        $hidden = match ($entity) {
            'expenses' => $isPublicVisitor ? $trip->public_show_expenses === false : ($role === 2 && $trip->viewer_show_expenses === false),
            'tasks' => $isPublicVisitor ? $trip->public_show_tasks === false : ($role === 2 && $trip->viewer_show_tasks === false),
            default => false,
        };
        if ($hidden) return response()->json([]);

        return response()->json($trip->{self::RELATIONS[$entity]}()->get());
    }

    public function store(Request $request, Trip $trip, string $entity): JsonResponse
    {
        $model = $this->model($entity);
        $request->validate(['id' => ['nullable', 'string', 'max:40']]);
        $data = $this->mapFields($request->except(['trip_id', 'created_at_ms', 'updated_at_ms']));
        unset($data['id']);
        $record = new $model($data);
        // Optional client-supplied id (matches the frontend's optimistic insert);
        // falls back to a server-generated id otherwise.
        $record->id = $request->input('id') ?: (string) Str::uuid();
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
        $record = $this->record($trip, $entity, $entityId);
        $this->deleteEntityDescGraph($record);
        $record->delete();
        return response()->json(['ok' => true]);
    }

    /** Delete a content entity's polymorphic comment graph (groups/objects/comments). */
    private function deleteEntityDescGraph(Activity|Accommodation|MacroPlan|Expense $record): void
    {
        $type = match (true) {
            $record instanceof Activity => 'activity',
            $record instanceof Accommodation => 'accommodation',
            $record instanceof MacroPlan => 'macroplan',
            default => 'expense',
        };
        $this->deleteRelatedComments($type, $record->id);
    }

    private function deleteRelatedComments(string $objectType, string $objectId): void
    {
        $typeNo = ['trip'=>0,'activity'=>1,'accommodation'=>2,'macroplan'=>3,'expense'=>4,'task'=>5][$objectType] ?? null;
        if ($typeNo === null) return;
        $object = CommentGroupObject::where('object_type', $typeNo)->where('object_id', $objectId)->first();
        if (!$object) return;
        $group = $object->commentGroup;
        if (!$group) return;
        $group->comments()->delete();
        $object->delete();
        $group->delete();
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

    private function model(string $entity): string
    {
        abort_unless(isset(self::MODELS[$entity]), 404, 'Unknown content type.');
        return self::MODELS[$entity];
    }

    private function record(Trip $trip, string $entity, string $id): Activity|Accommodation|MacroPlan|Expense
    {
        return $trip->{self::RELATIONS[$entity]}()->whereKey($id)->firstOrFail();
    }

    private function recordById(string $entity, string $id): Activity|Accommodation|MacroPlan|Expense
    {
        $model = $this->model($entity);
        return $model::with('trip')->whereKey($id)->firstOrFail();
    }
}