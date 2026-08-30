<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table): void {
            $table->bigInteger('archived_at_ms')->nullable()->after('updated_at_ms');
            $table->index(['archived_at_ms', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table): void {
            $table->dropIndex(['archived_at_ms', 'id']);
            $table->dropColumn('archived_at_ms');
        });
    }
};
