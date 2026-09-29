<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Accommodation extends Model
{
    protected $guarded = [];

    use HasMsTimestamps, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
