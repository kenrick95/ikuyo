<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['title', 'region', 'currency', 'origin_region', 'origin_currency', 'origin_timezone', 'timezone', 'timestamp_start_ms', 'timestamp_end_ms', 'sharing_level', 'public_show_expenses', 'public_show_tasks', 'public_show_comments', 'viewer_show_expenses', 'viewer_show_tasks', 'viewer_show_comments', 'created_at_ms', 'updated_at_ms'])]
class Trip extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }

    public function accommodations(): HasMany
    {
        return $this->hasMany(Accommodation::class);
    }

    public function macroPlans(): HasMany
    {
        return $this->hasMany(MacroPlan::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function taskLists(): HasMany
    {
        return $this->hasMany(TaskList::class);
    }

    public function commentGroups(): HasMany
    {
        return $this->hasMany(CommentGroup::class);
    }

    // N:N to users through the `trip_user` pivot, carrying the `role` column.
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'trip_user')
            ->withPivot('id', 'role', 'created_at_ms', 'updated_at_ms');
    }
}