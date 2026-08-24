<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Provides millisecond-epoch created_at_ms / updated_at_ms columns,
 * matching Instant's epoch-ms timestamps (see instant.schema.ts).
 *
 * Set `public $timestamps = false;` on the model and use this trait.
 * Columns are `bigInteger('created_at_ms')` / `bigInteger('updated_at_ms')`.
 */
trait HasMsTimestamps
{
    protected static function bootHasMsTimestamps(): void
    {
        // `saving` fires before both insert and update, so we set the ms columns
        // just-in-time; no save() call here, therefore no recursion. Uses the
        // real static event API, which also satisfies static-analysis tools.
        static::saving(static function ($model): void {
            $now = (int) round(microtime(true) * 1000);
            if (!$model->exists || !array_key_exists('created_at_ms', $model->getAttributes())) {
                $model->created_at_ms = $now;
            }
            $model->updated_at_ms = $now;
        });
    }
}