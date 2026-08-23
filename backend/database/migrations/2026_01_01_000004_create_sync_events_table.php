<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_events', function (Blueprint $table): void {
            $table->id();
            $table->string('entity', 64);
            $table->string('entity_id', 40);
            $table->string('operation', 16);
            $table->string('trip_id', 40)->nullable();
            $table->json('payload')->nullable();
            $table->unsignedBigInteger('created_at_ms');
            $table->index(['trip_id', 'id']);
            $table->index(['entity', 'entity_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_events');
    }
};