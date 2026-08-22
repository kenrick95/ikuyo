<?php

use App\Http\Controllers\Api\TripController;
use Illuminate\Support\Facades\Route;

// The `/api` prefix and API middleware are applied by bootstrap/app.php.
Route::get('/trips', [TripController::class, 'index']);
Route::get('/trips/public', [TripController::class, 'publicIndex']);
Route::get('/trips/{trip}', [TripController::class, 'show']);
