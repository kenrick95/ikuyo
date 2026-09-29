<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    protected $guarded = [];

    use HasMsTimestamps, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected static function booted(): void
    {
        static::addGlobalScope('activeParent', fn (Builder $query) => $query->whereHas('taskList'));
    }

    public function taskList(): BelongsTo
    {
        return $this->belongsTo(TaskList::class);
    }
}
