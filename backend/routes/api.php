<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\MetadataController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
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
    Route::get('/trips/public', [TripController::class, 'publicIndex']);
    Route::get('/metadata/trips/{trip}', [MetadataController::class, 'trip']);
    Route::get('/sync', SyncController::class)->middleware('auth');
    Route::get('/trips', [TripController::class, 'index'])->middleware('auth');
    Route::get('/trips/{trip}', [TripController::class, 'show'])
        ->middleware('trip.access:view');
    Route::put('/activities/{activity}', [ContentController::class, 'activityUpdate'])
        ->middleware('auth');
    Route::delete('/activities/{activity}', [ContentController::class, 'activityDestroy'])
        ->middleware('auth');
    Route::put('/{entity}/{entityId}', [ContentController::class, 'byIdUpdate'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware('auth');
    Route::delete('/{entity}/{entityId}', [ContentController::class, 'byIdDestroy'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware('auth');

    Route::post('/trips', [TripController::class, 'store'])->middleware('auth');
    Route::delete('/trips/{trip}', [TripController::class, 'destroy'])
        ->middleware(['auth', 'trip.access:manage']);

    Route::put('/trips/{trip}', [TripController::class, 'update'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/duplicate', [TripController::class, 'duplicate'])
        ->middleware(['auth', 'trip.access:view']);
    Route::patch('/trips/{trip}/sharing', [TripController::class, 'sharing'])
        ->middleware(['auth', 'trip.access:manage']);
    Route::patch('/trips/{trip}/sections', [TripController::class, 'sections'])
        ->middleware(['auth', 'trip.access:manage']);

    Route::get('/trips/{trip}/{entity}', [ContentController::class, 'index'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware('trip.access:view');
    Route::patch('/trips/{trip}/activities/batch', [ContentController::class, 'activityBatchUpdate'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/{entity}', [ContentController::class, 'store'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::put('/trips/{trip}/{entity}/{entityId}', [ContentController::class, 'update'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::delete('/trips/{trip}/{entity}/{entityId}', [ContentController::class, 'destroy'])
        ->whereIn('entity', ['activities', 'accommodations', 'macroplans', 'expenses'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/activities/{activity}/drag-end', [ContentController::class, 'activityDragEnd'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/activities/{activity}/duplicate', [ContentController::class, 'activityDuplicate'])
        ->middleware(['auth', 'trip.access:edit']);

    Route::put('/task-lists/{taskList}', [TaskController::class, 'updateListById'])
        ->middleware('auth');
    Route::patch('/tasks/{task}/index', [TaskController::class, 'reorderById'])
        ->middleware('auth');
    Route::post('/tasks/{task}/move', [TaskController::class, 'moveById'])
        ->middleware('auth');
    Route::put('/tasks/{task}', [TaskController::class, 'updateById'])
        ->middleware('auth');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroyById'])
        ->middleware('auth');
    Route::delete('/task-lists/{taskList}', [TaskController::class, 'destroyListById'])
        ->middleware('auth');

    Route::post('/trips/{trip}/task-lists', [TaskController::class, 'storeList'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::put('/trips/{trip}/task-lists/{taskList}', [TaskController::class, 'updateList'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::delete('/trips/{trip}/task-lists/{taskList}', [TaskController::class, 'destroyList'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/task-lists/{taskList}/tasks', [TaskController::class, 'storeTask'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::put('/trips/{trip}/task-lists/{taskList}/tasks/{task}', [TaskController::class, 'updateTask'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::delete('/trips/{trip}/task-lists/{taskList}/tasks/{task}', [TaskController::class, 'destroyTask'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::patch('/trips/{trip}/tasks/reorder', [TaskController::class, 'reorderTasks'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::patch('/trips/{trip}/task-lists/reorder', [TaskController::class, 'reorderLists'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::post('/trips/{trip}/tasks/{task}/move', [TaskController::class, 'moveTask'])
        ->middleware(['auth', 'trip.access:edit']);

    Route::patch('/comment-groups/{group}/status', [CommentController::class, 'updateStatusById'])
        ->middleware('auth');
    Route::put('/comments/{comment}', [CommentController::class, 'updateById'])
        ->middleware('auth');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroyById'])
        ->middleware('auth');

    Route::post('/trips/{trip}/comment-groups', [CommentController::class, 'store'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::patch('/trips/{trip}/comment-groups/{group}/status', [CommentController::class, 'updateStatus'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::put('/trips/{trip}/comment-groups/{group}/comments/{comment}', [CommentController::class, 'update'])
        ->middleware(['auth', 'trip.access:edit']);
    Route::delete('/trips/{trip}/comment-groups/{group}/comments/{comment}', [CommentController::class, 'destroy'])
        ->middleware(['auth', 'trip.access:edit']);

    Route::get('/users/me', [UserController::class, 'me'])->middleware('auth');
    Route::get('/users/by-handle/{handle}', [UserController::class, 'byHandle']);
    Route::post('/users/check-email', [UserController::class, 'checkEmail']);
    Route::post('/users/generate-handle', [UserController::class, 'generateHandle']);
    Route::put('/users/me/preferences', [UserController::class, 'updatePreferences'])->middleware('auth');
    Route::patch('/users/me', [UserController::class, 'update'])->middleware('auth');
    Route::post('/trips/{trip}/members', [UserController::class, 'addMember'])
        ->middleware(['auth', 'trip.access:manage']);
    Route::patch('/trips/{trip}/members/{member}', [UserController::class, 'updateMember'])
        ->middleware(['auth', 'trip.access:manage']);
    Route::post('/trips/{trip}/members/update', [UserController::class, 'updateMemberByEmail'])
        ->middleware(['auth', 'trip.access:manage']);
    Route::delete('/members/{member}', [UserController::class, 'removeMemberById'])
        ->middleware('auth');
    Route::delete('/trips/{trip}/members/{member}', [UserController::class, 'removeMember'])
        ->middleware(['auth', 'trip.access:manage']);
});
