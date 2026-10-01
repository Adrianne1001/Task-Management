<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    public const API_REQUESTS_PER_MINUTE = 60;

    public const LOGIN_ATTEMPTS_PER_MINUTE = 5;

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
        $this->configureRateLimiting();
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request): Limit => Limit::perMinute(self::API_REQUESTS_PER_MINUTE)
            ->by($request->user() ? 'user:'.$request->user()->getAuthIdentifier() : 'ip:'.$request->ip()));

        // Keyed by email + IP: slows down guessing one account's password without locking out a shared IP.
        RateLimiter::for('login', fn (Request $request): Limit => Limit::perMinute(self::LOGIN_ATTEMPTS_PER_MINUTE)
            ->by(Str::lower((string) $request->input('email')).'|'.$request->ip()));
    }
}
