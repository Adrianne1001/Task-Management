<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use RuntimeException;
use Tests\Concerns\AuthenticatesUser;
use Tests\TestCase;

/**
 * Every API error uses the same JSON envelope and never leaks internals.
 */
class ErrorHandlingTest extends TestCase
{
    use AuthenticatesUser;
    use RefreshDatabase;

    public function test_missing_project_returns_a_named_404(): void
    {
        $this->getJson('/api/projects/999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Project not found.']);
    }

    public function test_unknown_api_route_returns_a_generic_404_without_the_path(): void
    {
        $this->getJson('/api/does-not-exist')
            ->assertNotFound()
            ->assertExactJson(['message' => 'The requested resource was not found.']);
    }

    public function test_unsupported_method_returns_405(): void
    {
        $this->patchJson('/api/projects/1', [])
            ->assertMethodNotAllowed()
            ->assertExactJson(['message' => 'The PATCH method is not supported for this endpoint.']);
    }

    public function test_validation_errors_use_the_message_and_errors_envelope(): void
    {
        $this->postJson('/api/projects', [])
            ->assertUnprocessable()
            ->assertJsonStructure(['message', 'errors' => ['clientName', 'projectName', 'status', 'priority']]);
    }

    public function test_requests_without_an_accept_header_still_get_json(): void
    {
        // No Accept: application/json — must not redirect back like a web form would.
        $this->post('/api/projects', [])
            ->assertUnprocessable()
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure(['message', 'errors']);
    }

    public function test_api_requests_are_rate_limited_with_429(): void
    {
        for ($i = 0; $i < AppServiceProvider::API_REQUESTS_PER_MINUTE; $i++) {
            $this->getJson('/api/meta/enums')->assertOk();
        }

        $this->getJson('/api/meta/enums')
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertExactJson(['message' => 'Too many requests. Please try again later.']);
    }

    public function test_unexpected_errors_return_a_generic_500_without_internals(): void
    {
        config(['app.debug' => false]);
        Route::middleware('api')->get('/api/_boom', fn () => throw new RuntimeException('SQLSTATE[42S02]: secret table'));

        $this->getJson('/api/_boom')
            ->assertInternalServerError()
            ->assertExactJson(['message' => 'Server error. Please try again later.'])
            ->assertDontSee('SQLSTATE');
    }
}
