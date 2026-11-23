<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rename in place so allocation JSON and payment foreign keys keep their IDs.
        Schema::rename('expense_participants', 'trip_people');
        Schema::table('trip_people', function (Blueprint $table): void {
            // Existing payers and shared accounts do not imply attendance.
            $table->boolean('is_participant')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('trip_people', fn (Blueprint $table) => $table->dropColumn('is_participant'));
        Schema::rename('trip_people', 'expense_participants');
    }
};
