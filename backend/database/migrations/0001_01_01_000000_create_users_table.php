<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table): void {
            // IDs are Instant-style UUID strings, preserved across the migration.
            $table->string('id', 40)->primary();
            $table->string('email', 255)->nullable()->unique();
            $table->string('handle', 64)->unique();
            $table->string('handle_key', 64)->nullable()->unique(); // lowercased dedupe key
            $table->string('auth_namespace_id', 40)->nullable()->unique(); // was $users.id
            $table->string('image_url', 1024)->nullable();
            $table->string('password_hash', 255)->nullable();
            $table->string('reset_token', 64)->nullable(); // store the token hash
            $table->bigInteger('reset_token_at')->nullable(); // expiry (ms)
            $table->boolean('activated')->default(true);
            $table->string('preferred_region', 8)->nullable();
            $table->string('preferred_currency', 8)->nullable();
            $table->string('preferred_timezone', 64)->nullable();
            $table->bigInteger('last_login_at')->nullable(); // ms epoch
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
        });

        Schema::create('sessions', function (Blueprint $table): void {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};