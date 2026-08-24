<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('title');
            $table->string('region', 8);
            $table->string('currency', 8);
            $table->string('origin_region', 8)->nullable();
            $table->string('origin_currency', 8)->nullable();
            $table->string('origin_timezone', 64)->nullable();
            $table->string('timezone', 64);
            $table->bigInteger('timestamp_start_ms');
            $table->bigInteger('timestamp_end_ms');
            // 0 private, 2 public-unlisted, 3 public-listed
            $table->tinyInteger('sharing_level')->default(0);
            $table->boolean('public_show_expenses')->nullable();
            $table->boolean('public_show_tasks')->nullable();
            $table->boolean('public_show_comments')->nullable();
            $table->boolean('viewer_show_expenses')->nullable();
            $table->boolean('viewer_show_tasks')->nullable();
            $table->boolean('viewer_show_comments')->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->index(['updated_at_ms', 'id']);
            $table->index(['timestamp_end_ms', 'id']);
        });

        // N:N trip <-> user with the role attribute on the pivot.
        // NOTE: ids are string(40), so the FK columns must be string(40) too —
        // not `foreignId()` which assumes bigint autoincrement ids.
        Schema::create('trip_user', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('user_id', 40);
            $table->tinyInteger('role'); // 0 owner / 1 editor / 2 viewer
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->unique(['trip_id', 'user_id']);
            $table->index(['updated_at_ms', 'id']);
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trip_user');
        Schema::dropIfExists('trips');
    }
};
