<?php

namespace App\Models;

use App\Models\Concerns\HasMsTimestamps;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['trip_id', 'amount', 'amount_in_origin_currency', 'currency', 'currency_conversion_factor', 'title', 'description', 'incurred_at_ms', 'timezone_incurred', 'created_at_ms', 'updated_at_ms'])]
class Expense extends Model
{
    use HasMsTimestamps;

    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    public function trip(): BelongsTo
    {
        return $this->belongsTo(Trip::class);
    }
}