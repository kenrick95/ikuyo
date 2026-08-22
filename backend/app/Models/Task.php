<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['task_list_id', 'index', 'title', 'description', 'status', 'due_at_ms', 'completed_at_ms', 'created_at_ms', 'updated_at_ms'])]
class Task extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function taskList(): BelongsTo
    {
        return $this->belongsTo(TaskList::class);
    }
}