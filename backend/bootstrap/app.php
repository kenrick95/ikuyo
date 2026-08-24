<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\AuthorizeTripAccess;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__.'/../routes/api.php',
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Initial auth requests cannot carry a session CSRF token yet.
        // All authenticated mutations remain CSRF-protected.
        $middleware->alias([
            'trip.access' => AuthorizeTripAccess::class,
        ]);

        // The frontend models empty strings as "" (matching InstantDB's required
        // string fields: description, location, ...) and sends `null` only for
        // optional numeric fields. The framework default empty-string→null
        // conversion fights that model and violates NOT NULL text columns
        // (e.g. activities.description/location) on save.
        $middleware->remove(
            \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
