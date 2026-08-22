<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    protected $guarded = [];

    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function taskList(): BelongsTo
    {
        return $this->belongsTo(TaskList::class);
    }
}