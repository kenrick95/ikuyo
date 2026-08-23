<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_lists', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->string('title');
            $table->integer('index');
            $table->tinyInteger('status'); // open / done
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });

        Schema::create('tasks', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('task_list_id', 40);
            $table->integer('index');
            $table->string('title');
            $table->text('description')->nullable();
            $table->tinyInteger('status'); // 0 todo / 1 done
            $table->bigInteger('due_at_ms')->nullable();
            $table->bigInteger('completed_at_ms')->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('task_list_id')->references('id')->on('task_lists')->cascadeOnDelete();
            $table->index(['task_list_id', 'updated_at_ms', 'id']);
        });

        Schema::create('comment_groups', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('trip_id', 40);
            $table->tinyInteger('status'); // 0 unresolved / 1 resolved
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
        });

        Schema::create('comment_group_objects', function (Blueprint $table): void {
            $table->string('id', 40)->primary();              // same id as comment_groups.id
            $table->string('comment_group_id', 40);
            $table->tinyInteger('object_type'); // 0 trip 1 activity 2 accommodation 3 macroplan 4 expense 5 task
            $table->string('object_id', 40)->nullable();
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('comment_group_id')->references('id')->on('comment_groups')->cascadeOnDelete();
            $table->index(['comment_group_id', 'updated_at_ms', 'id']);
        });

        Schema::create('comments', function (Blueprint $table): void {
            $table->string('id', 40)->primary();
            $table->string('comment_group_id', 40);
            $table->string('user_id', 40);
            $table->text('content');
            $table->bigInteger('created_at_ms');
            $table->bigInteger('updated_at_ms');
            $table->foreign('comment_group_id')->references('id')->on('comment_groups')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['comment_group_id', 'updated_at_ms', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
        Schema::dropIfExists('comment_group_objects');
        Schema::dropIfExists('comment_groups');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('task_lists');
    }
};