<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Renders every error raised under /api as the same JSON envelope:
 * `{ "message": "..." }`, plus `"errors": { field: [...] }` for validation failures.
 *
 * Messages are written for API consumers; framework internals (routes, SQL, traces) never leak.
 */
final class ApiExceptionRenderer
{
    public function __invoke(Throwable $e, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*')) {
            return null;
        }

        return match (true) {
            // Laravel already renders these as { message, errors } with status 422.
            $e instanceof ValidationException => null,
            $e instanceof AuthenticationException => $this->json('Unauthenticated.', Response::HTTP_UNAUTHORIZED),
            $e instanceof HttpExceptionInterface => $this->json(
                $this->httpMessage($e, $request),
                $e->getStatusCode(),
                $e->getHeaders(),
            ),
            // In local debug mode, fall through to Laravel's detailed output.
            (bool) config('app.debug') => null,
            default => $this->json('Server error. Please try again later.', Response::HTTP_INTERNAL_SERVER_ERROR),
        };
    }

    private function httpMessage(HttpExceptionInterface $e, Request $request): string
    {
        return match ($e->getStatusCode()) {
            Response::HTTP_NOT_FOUND => $this->notFoundMessage($e),
            Response::HTTP_METHOD_NOT_ALLOWED => "The {$request->method()} method is not supported for this endpoint.",
            Response::HTTP_TOO_MANY_REQUESTS => 'Too many requests. Please try again later.',
            419 => 'CSRF token mismatch. Refresh the page and try again.',
            default => $e->getMessage() !== '' ? $e->getMessage() : Response::$statusTexts[$e->getStatusCode()] ?? 'Error.',
        };
    }

    private function notFoundMessage(HttpExceptionInterface $e): string
    {
        $previous = $e instanceof Throwable ? $e->getPrevious() : null;

        if ($previous instanceof ModelNotFoundException) {
            return Str::ucfirst(Str::snake(class_basename($previous->getModel()), ' ')).' not found.';
        }

        return 'The requested resource was not found.';
    }

    /**
     * @param  array<string, string>  $headers
     */
    private function json(string $message, int $status, array $headers = []): JsonResponse
    {
        return new JsonResponse(['message' => $message], $status, $headers);
    }
}
