<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TripController;
use Illuminate\Support\Facades\Route;

// The `/api` prefix is applied by bootstrap/app.php.
Route::middleware('web')->get('/csrf-token', fn () => response()->json([
    'token' => csrf_token(),
]));

Route::middleware('web')->prefix('auth')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/guest', [AuthController::class, 'guest']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
    Route::post('/upgrade', [AuthController::class, 'upgrade'])->middleware('auth');
    Route::post('/forgot', [AuthController::class, 'forgot']);
    Route::post('/reset', [AuthController::class, 'reset']);
});

Route::middleware('web')->group(function (): void {
    Route::get('/trips/{trip}', [TripController::class, 'show'])
        ->middleware('trip.access:view');
    Route::get('/trips', [TripController::class, 'index'])->middleware('auth');
    Route::get('/trips/public', [TripController::class, 'publicIndex']);

    Route::middleware(['auth', 'trip.access:manage'])->group(function (): void {
        Route::post('/trips', [TripController::class, 'store']);
        Route::delete('/trips/{trip}', [TripController::class, 'destroy']);
    });

    Route::put('/trips/{trip}', [TripController::class, 'update'])
        ->middleware(['auth', 'trip.access:edit']);
});
