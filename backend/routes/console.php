<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('users:prune-inactive --execute')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->when(fn () => (bool) config('accounts.cleanup_enabled'));

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
