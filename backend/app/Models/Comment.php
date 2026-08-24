<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Comment extends Model
{
    protected $guarded = [];

    use HasMsTimestamps;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    public function commentGroup(): BelongsTo
    {
        return $this->belongsTo(CommentGroup::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
