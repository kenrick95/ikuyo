<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_events', function (Blueprint $table): void {
            $table->id();
            $table->string('actor_user_id', 40);
            $table->string('actor_handle', 64);
            $table->string('trip_id', 40)->nullable();
            $table->string('target_type', 40);
            $table->string('target_id', 40)->nullable();
            $table->string('action', 32);
            $table->json('details');
            $table->unsignedBigInteger('created_at_ms');
            $table->index(['trip_id', 'id']);
            $table->index(['actor_user_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_events');
    }
};
