<?php

namespace App\Services;

use App\Models\SyncEvent;
use Illuminate\Database\Eloquent\Model;

class SyncEventService
{
    public function record(string $entity, string $entityId, string $operation, ?string $tripId, ?array $payload = null): SyncEvent
    {
        return SyncEvent::create([
            'entity' => $entity,
            'entity_id' => $entityId,
            'operation' => $operation,
            'trip_id' => $tripId,
            'payload' => $payload,
            'created_at_ms' => (int) round(microtime(true) * 1000),
        ]);
    }

    public function upsert(string $entity, Model $model, ?string $tripId = null): SyncEvent
    {
        $model->refresh();
        return $this->record($entity, (string) $model->getKey(), 'upsert', $tripId, $model->toArray());
    }

    public function delete(string $entity, string $entityId, ?string $tripId = null): SyncEvent
    {
        return $this->record($entity, $entityId, 'delete', $tripId);
    }
}