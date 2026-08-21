<?php

use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// A tiny exploration API. Replace the closures with controllers as you grow.
// The `api` prefix + api middleware are applied automatically via bootstrap/app.php.
Route::group([], function (): void {
    Route::get('/trips', fn () => response()->json(
        Trip::with(['users', 'activities', 'comments'])->get()
    ));

    Route::get('/trips/{trip}', function (mixed $trip): object {
        $trip = Trip::with(['users', 'activities.comments', 'comments.user'])->findOrFail($trip);
        return response()->json($trip);
    });

    // Demonstrate the SQL behind an Eloquent query.
    Route::get('/trips/{trip}/sql', function (mixed $trip): object {
        $q = Trip::withCount('activities')->where('id', $trip);
        return response()->json([
            'sql'      => $q->toSql(),
            'bindings' => $q->getBindings(),
        ]);
    });

    // Pivot query: which trips does a given user belong to, with their role?
    Route::get('/users/{user}/trips', function (mixed $user): object {
        $user = User::findOrFail($user);
        return response()->json($user->trips->map(fn ($t) => [
            'trip' => $t->title,
            'role' => $t->pivot->role,
        ]));
    });

    // A direct DB query builder example (the "escape hatch" below Eloquent).
    Route::get('/db/example', function (): object {
        $row = DB::table('trip_user')
            ->join('trips', 'trips.id', '=', 'trip_user.trip_id')
            ->select('trips.title', 'trip_user.role')
            ->get();
        return response()->json($row);
    });
});