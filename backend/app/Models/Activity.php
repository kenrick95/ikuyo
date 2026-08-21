<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable(['trip_id', 'title', 'location', 'location_lat', 'location_lng', 'description', 'timestamp_start_ms', 'timestamp_end_ms'])]
class Activity extends \Illuminate\Database\Eloquent\Model
{
    protected $table = 'activities';

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}