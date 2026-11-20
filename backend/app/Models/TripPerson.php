<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TripPerson extends Model
{
    protected $table = 'trip_people';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $casts = ['is_participant' => 'boolean'];

    /** @return BelongsTo<Trip, $this> */
    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
