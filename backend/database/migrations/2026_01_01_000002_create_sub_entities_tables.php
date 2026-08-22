<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('title');
            $table->string('location')->default('');
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();
            $table->tinyInteger('location_zoom')->nullable();
            $table->string('location_destination')->nullable();
            $table->decimal('location_destination_lat', 10, 7)->nullable();
            $table->decimal('location_destination_lng', 10, 7)->nullable();
            $table->tinyInteger('location_destination_zoom')->nullable();
            $table->text('description')->default('');
            $table->bigInteger('timestamp_start_ms')->nullable();
            $table->bigInteger('timestamp_end_ms')->nullable();
            $table->string('timezone_start', 64)->nullable();
            $table->string('timezone_end', 64)->nullable();
            $table->integer('flags')->nullable();
            $table->string('icon', 16)->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });

        Schema::create('accommodations', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('name');
            $table->string('address', 512)->nullable();
            $table->string('phone_number', 64)->nullable();
            $table->text('notes')->nullable();
            $table->bigInteger('check_in_ms');
            $table->bigInteger('check_out_ms');
            $table->string('tz_check_in', 64)->nullable();
            $table->string('tz_check_out', 64)->nullable();
            $table->decimal('location_lat', 10, 7)->nullable();
            $table->decimal('location_lng', 10, 7)->nullable();
            $table->tinyInteger('location_zoom')->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });

        Schema::create('macro_plans', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('name');
            $table->text('notes')->nullable();
            $table->bigInteger('timestamp_start_ms');
            $table->bigInteger('timestamp_end_ms');
            $table->string('timezone_start', 64)->nullable();
            $table->string('timezone_end', 64)->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });

        Schema::create('expenses', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->decimal('amount', 12, 2);
            $table->decimal('amount_in_origin_currency', 12, 2);
            $table->string('currency', 8);
            $table->decimal('currency_conversion_factor', 12, 6);
            $table->string('title');
            $table->string('description')->nullable();
            $table->bigInteger('incurred_at_ms');
            $table->string('timezone_incurred', 64)->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('macro_plans');
        Schema::dropIfExists('accommodations');
        Schema::dropIfExists('activities');
    }
};