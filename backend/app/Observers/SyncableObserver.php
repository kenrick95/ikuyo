<?php

namespace App\Observers;

use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\TripUser;
use App\Services\SyncEventService;
use Illuminate\Database\Eloquent\Model;

class SyncableObserver
{
    public function __construct(private readonly SyncEventService $events) {}

    public function created(Model $model): void { $this->record('upsert', $model); }
    public function updated(Model $model): void { $this->record('upsert', $model); }
    public function deleted(Model $model): void { $this->record('delete', $model); }

    private function record(string $operation, Model $model): void
    {
        $entity = match (true) {
            $model instanceof Trip => 'trips',
            $model instanceof TripUser => 'trip_user',
            $model instanceof Activity => 'activities',
            $model instanceof Accommodation => 'accommodations',
            $model instanceof MacroPlan => 'macroplans',
            $model instanceof Expense => 'expenses',
            $model instanceof TaskList => 'task_lists',
            $model instanceof Task => 'tasks',
            $model instanceof CommentGroup => 'comment_groups',
            $model instanceof CommentGroupObject => 'comment_group_objects',
            $model instanceof Comment => 'comments',
            default => null,
        };
        if ($entity === null) return;
        $tripId = $this->tripId($model);
        $payload = $operation === 'upsert' ? $model->toArray() : null;
        $this->events->record($entity, (string) $model->getKey(), $operation, $tripId, $payload);
    }

    private function tripId(Model $model): ?string
    {
        if ($model instanceof Trip) return $model->id;
        if (array_key_exists('trip_id', $model->getAttributes())) return $model->trip_id;
        if ($model instanceof TripUser) return $model->trip_id;
        if ($model instanceof CommentGroupObject) return $model->commentGroup?->trip_id;
        if ($model instanceof Comment) return $model->commentGroup?->trip_id;
        if ($model instanceof Task) return $model->taskList?->trip_id;
        return null;
    }
}