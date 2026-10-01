<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MetaController;
use App\Http\Controllers\ProjectController;
use Illuminate\Support\Facades\Route;

Route::controller(AuthController::class)
    ->prefix('auth')
    ->name('auth.')
    ->group(function (): void {
        Route::post('/login', 'login')->middleware('throttle:login')->name('login');

        Route::middleware('auth:sanctum')->group(function (): void {
            Route::post('/logout', 'logout')->name('logout');
            Route::get('/me', 'me')->name('me');
        });
    });

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/meta/enums', [MetaController::class, 'enums'])->name('meta.enums');

    // Declared explicitly rather than with apiResource so updates accept PUT only:
    // an update is a full replacement, and PATCH would suggest partial updates.
    Route::controller(ProjectController::class)
        ->prefix('projects')
        ->name('projects.')
        ->whereNumber('project')
        ->group(function (): void {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::get('/{project}', 'show')->name('show');
            Route::put('/{project}', 'update')->name('update');
            Route::delete('/{project}', 'destroy')->name('destroy');
        });
});
