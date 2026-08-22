<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['trip_id', 'name', 'notes', 'timestamp_start_ms', 'timestamp_end_ms', 'timezone_start', 'timezone_end', 'created_at_ms', 'updated_at_ms'])]
class MacroPlan extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $table = 'macro_plans';

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}