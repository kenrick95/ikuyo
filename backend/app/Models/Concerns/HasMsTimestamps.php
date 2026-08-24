<?php

namespace App\Models\Concerns;

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
        // TODO: intelephense complains Undefined method 'creating'.
        static::creating(static function ($model): void {
            $now = (int) round(microtime(true) * 1000);
            $model->created_at_ms = $now;
            $model->updated_at_ms = $now;
        });

        // TODO: intelephense complains Undefined method 'updating'.
        static::updating(static function ($model): void {
            if ($model->isDirty() || $model->wasRecentlyCreated === false) {
                $model->updated_at_ms = (int) round(microtime(true) * 1000);
            }
        });
    }
}