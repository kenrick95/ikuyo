<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            $table->string('macro_plan_id', 40)->nullable()->after('trip_id');
            $table->string('planning_status', 16)->nullable()->after('flags');
            $table->foreign('macro_plan_id')->references('id')->on('macro_plans')->nullOnDelete();
            $table->index(['macro_plan_id', 'timestamp_start_ms']);
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table): void {
            $table->dropForeign(['macro_plan_id']);
            $table->dropIndex(['macro_plan_id', 'timestamp_start_ms']);
            $table->dropColumn(['macro_plan_id', 'planning_status']);
        });
    }
};
