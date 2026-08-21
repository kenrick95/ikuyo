<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mirrors the plan's `trips` table (Instant `trip` entity).
        Schema::create('trips', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->string('region', 8);
            $table->string('currency', 8);
            $table->string('timezone', 64);
            // Instant stores unix-millisecond ints; keep them as BIGINT, not datetime.
            $table->bigInteger('timestamp_start_ms');
            $table->bigInteger('timestamp_end_ms');
            // 0 private, 2 public-unlisted, 3 public-listed
            $table->tinyInteger('sharing_level')->default(0);
            $table->boolean('public_show_expenses')->nullable();
            $table->bigInteger('created_at_ms')->nullable();
            $table->bigInteger('updated_at_ms')->nullable();
            $table->timestamps();
        });

        // The N:N join with an extra column (`role`) lives on the pivot.
        Schema::create('trip_user', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('trip_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 10)->default('viewer'); // owner|editor|viewer
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_user');
        Schema::dropIfExists('trips');
    }
};