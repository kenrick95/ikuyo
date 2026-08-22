<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['trip_id', 'name', 'address', 'phone_number', 'notes', 'check_in_ms', 'check_out_ms', 'tz_check_in', 'tz_check_out', 'location_lat', 'location_lng', 'location_zoom', 'created_at_ms', 'updated_at_ms'])]
class Accommodation extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}