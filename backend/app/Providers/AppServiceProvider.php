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
        foreach ([User::class, Trip::class, TripUser::class, Activity::class, Accommodation::class, MacroPlan::class, Expense::class, TaskList::class, Task::class, CommentGroup::class, CommentGroupObject::class, Comment::class] as $model) {
            $model::observe(SyncableObserver::class);
        }
    }
}
