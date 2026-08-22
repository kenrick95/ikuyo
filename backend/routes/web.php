<?php

use Illuminate\Support\Facades\Route;

// JSON-only API: the default `/` and welcome Blade view (Vite) were removed.
// Return a tiny JSON hello so hitting `/` still gives something sensible.
Route::get('/', fn () => response()->json([
    'app' => 'ikuyo-backend',
    'api' => '/api',
]));
