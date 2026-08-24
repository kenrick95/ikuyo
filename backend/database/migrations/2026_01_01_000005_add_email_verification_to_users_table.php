<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->boolean('email_verified')->default(false)->after('activated');
            // Token used to confirm a new/change of email; null when no pending change.
            $table->string('email_verify_token_hash', 64)->nullable()->after('email_verified');
            $table->bigInteger('email_verify_token_at')->nullable()->after('email_verify_token_hash');
            // Pending email awaiting confirmation (for change-email flow).
            $table->string('pending_email', 255)->nullable()->after('email_verify_token_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['email_verified', 'email_verify_token_hash', 'email_verify_token_at', 'pending_email']);
        });
    }
};
