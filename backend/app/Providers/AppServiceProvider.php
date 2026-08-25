<?php

namespace App\Providers;

use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Expense;
use App\Models\MacroPlan;
use App\Models\Task;
use App\Models\TaskList;
use App\Models\Trip;
use App\Models\TripUser;
use App\Models\User;
use App\Observers\SyncableObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->ensureStorageDirectories();

        foreach ([User::class, Trip::class, TripUser::class, Activity::class, Accommodation::class, MacroPlan::class, Expense::class, TaskList::class, Task::class, CommentGroup::class, CommentGroupObject::class, Comment::class] as $model) {
            $model::observe(SyncableObserver::class);
        }
    }

    /**
     * On shared hosting the storage/framework dirs may be absent or unwritable
     * after deploy. The Blade compiler needs storage/framework/views to compile
     * mail/Blade templates (else it throws "Please provide a valid cache path")
     * and sessions/cache need their dirs too. Create + chmod them if missing.
     */
    private function ensureStorageDirectories(): void
    {
        $base = storage_path('framework');
        foreach (['views', 'cache/data', 'sessions'] as $dir) {
            $path = $base . '/' . $dir;
            try {
                if (! is_dir($path)) {
                    if (! @mkdir($path, 0775, true) && ! is_dir($path)) {
                        continue; // not fatal; other dirs may still work
                    }
                }
                @chmod($path, 0775);
            } catch (\Throwable $e) {
                // Never let storage dir provisioning crash the app.
            }
        }
    }
}
