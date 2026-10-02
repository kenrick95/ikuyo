<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class CommentGroup extends Model
{
    protected $guarded = [];

    use HasMsTimestamps, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected static function booted(): void
    {
        static::addGlobalScope('activeTrip', fn (Builder $query) => $query->whereHas('trip'));
    }

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function object(): HasOne
    {
        return $this->hasOne(CommentGroupObject::class);
    }
}
