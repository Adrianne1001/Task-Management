<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Global, so headers are also set on responses for unmatched routes.
        $middleware->append(SecurityHeaders::class);

        // Opt-in, for hosts behind a proxy (e.g. Vercel), so rate limits key on the client IP
        // and not the proxy's. Off by default: trusting X-Forwarded-* lets clients spoof their IP.
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : explode(',', $proxies));
        }

        $middleware->api(prepend: [ForceJsonResponse::class]);

        // Sanctum SPA cookie auth: sessions + CSRF for requests from SANCTUM_STATEFUL_DOMAINS.
        $middleware->statefulApi();

        // Uses the "api" limiter defined in AppServiceProvider.
        $middleware->throttleApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(new ApiExceptionRenderer);
    })->create();
