<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CONTENT_TABLES = [
        'trips', 'activities', 'accommodations', 'macro_plans', 'expenses',
        'task_lists', 'tasks', 'comment_groups', 'comment_group_objects', 'comments',
    ];

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 16)->default('user');
            $table->softDeletes();
        });

        foreach (self::CONTENT_TABLES as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->softDeletes();
            });
        }
    }

    public function down(): void
    {
        foreach (self::CONTENT_TABLES as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->dropSoftDeletes();
            });
        }
        Schema::table('users', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn('role');
        });
    }
};
