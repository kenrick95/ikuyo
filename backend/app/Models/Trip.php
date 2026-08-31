<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Trip extends Model
{
    protected $guarded = [];

    use HasMsTimestamps;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'archived_at_ms' => 'integer',
            // Nullable section-visibility flags: null = visible, 0/'0' = hidden.
            'public_show_expenses' => 'boolean',
            'public_show_tasks' => 'boolean',
            'public_show_comments' => 'boolean',
            'viewer_show_expenses' => 'boolean',
            'viewer_show_tasks' => 'boolean',
            'viewer_show_comments' => 'boolean',
        ];
    }

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
