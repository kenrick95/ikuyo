<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->decimal('amount_in_origin_currency', 30, 10)->nullable()->change();
            $table->decimal('currency_conversion_factor', 30, 16)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->decimal('amount_in_origin_currency', 30, 10)->nullable(false)->change();
            $table->decimal('currency_conversion_factor', 30, 16)->nullable(false)->change();
        });
    }
};
