<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    protected $guarded = [];

    protected $hidden = ['creation_hash'];

    use HasMsTimestamps, SoftDeletes;

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

    protected $casts = ['ledger' => 'array', 'ledger_revision' => 'integer'];

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}
