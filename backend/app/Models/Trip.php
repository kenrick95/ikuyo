<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable(['title', 'region', 'currency', 'timezone', 'timestamp_start_ms', 'timestamp_end_ms', 'sharing_level'])]
class Trip extends \Illuminate\Database\Eloquent\Model
{
    protected $table = 'trips';

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    // N:N to users through the `trip_user` pivot, carrying the `role` column.
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'trip_user')
            ->withPivot('role')
            ->withTimestamps();
    }

    // Polymorphic comments: Comment points back to whatever `commentable` model this is.
    public function comments(): MorphMany
    {
        return $this->morphMany(Comment::class, 'commentable');
    }
}