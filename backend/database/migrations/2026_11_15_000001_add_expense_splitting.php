<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->json('ledger')->nullable();
            $table->unsignedInteger('ledger_revision')->default(0);
            $table->string('creation_hash', 64)->nullable();
        });
        Schema::create('expense_participants', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('user_id', 40)->nullable();
            $table->string('name', 100);
            $table->bigInteger('created_at_ms');
            $table->bigInteger('archived_at_ms')->nullable();
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->unique(['trip_id', 'user_id']);
        });
        Schema::create('expense_payments', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('sender_id', 40);
            $table->string('recipient_id', 40);
            $table->string('currency', 3);
            $table->bigInteger('amount_minor');
            $table->string('paid_currency', 3);
            $table->bigInteger('paid_amount_minor');
            $table->date('paid_on');
            $table->string('note', 500)->default('');
            $table->bigInteger('created_at_ms');
            $table->bigInteger('voided_at_ms')->nullable();
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->foreign('sender_id')->references('id')->on('expense_participants')->cascadeOnDelete();
            $table->foreign('recipient_id')->references('id')->on('expense_participants')->cascadeOnDelete();
            $table->index(['trip_id', 'created_at_ms']);
        });
        Schema::create('expense_history', function (Blueprint $table): void {
            $table->id();
            $table->string('trip_id', 40);
            $table->string('entity_id', 40);
            $table->string('operation', 30);
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->string('actor_id', 40)->nullable();
            $table->bigInteger('created_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_history');
        Schema::dropIfExists('expense_payments');
        Schema::dropIfExists('expense_participants');
        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropColumn(['ledger', 'ledger_revision', 'creation_hash']);
        });
    }
};
