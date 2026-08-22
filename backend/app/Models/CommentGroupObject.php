<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['comment_group_id', 'object_type', 'object_id', 'created_at_ms', 'updated_at_ms'])]
class CommentGroupObject extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function commentGroup(): BelongsTo
    {
        return $this->belongsTo(CommentGroup::class);
    }
}