<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['user_id', 'commentable_type', 'commentable_id', 'content'])]
class Comment extends \Illuminate\Database\Eloquent\Model
{
    protected $table = 'comments';

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // The polymorphic side: resolves commentable_type/commentable_id to Trip|Activity|...
    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }
}