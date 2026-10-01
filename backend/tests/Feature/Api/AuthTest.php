<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Sanctum SPA cookie authentication: login, logout, current user, and protection of the data endpoints.
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const FRONTEND_ORIGIN = 'http://localhost:4200';

    private const PASSWORD = 'correct-horse-battery';

    protected function setUp(): void
    {
        parent::setUp();

        // Requests from this origin get Sanctum's session middleware, as the SPA's do.
        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->withHeader('Origin', self::FRONTEND_ORIGIN);
    }

    private function user(): User
    {
        return User::factory()->create(['email' => 'jane@example.com', 'password' => self::PASSWORD]);
    }

    public function test_login_with_valid_credentials_returns_the_user_and_starts_a_session(): void
    {
        $user = $this->user();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertExactJson(['data' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]]);

        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_login_with_a_wrong_password_returns_422_without_starting_a_session(): void
    {
        $this->user();

        $this->postJson('/api/auth/login', ['email' => 'jane@example.com', 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertExactJson([
                'message' => 'These credentials do not match our records.',
                'errors' => ['email' => ['These credentials do not match our records.']],
            ]);

        $this->assertGuest('web');
    }

    public function test_login_requires_email_and_password(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_login_rejects_a_malformed_email(): void
    {
        $this->postJson('/api/auth/login', ['email' => 'not-an-email', 'password' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        $this->user();
        $attempt = ['email' => 'jane@example.com', 'password' => 'wrong'];

        for ($i = 0; $i < AppServiceProvider::LOGIN_ATTEMPTS_PER_MINUTE; $i++) {
            $this->postJson('/api/auth/login', $attempt)->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', $attempt)
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertExactJson(['message' => 'Too many requests. Please try again later.']);

        // The correct password is refused too while the limit is active.
        $this->postJson('/api/auth/login', [...$attempt, 'password' => self::PASSWORD])->assertTooManyRequests();
    }

    public function test_me_returns_the_authenticated_user(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertExactJson(['data' => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email]]);
    }

    public function test_logout_ends_the_session(): void
    {
        $this->actingAs($this->user())
            ->postJson('/api/auth/logout')
            ->assertNoContent();

        $this->assertGuest('web');
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function protectedEndpoints(): array
    {
        return [
            'me' => ['GET', '/api/auth/me'],
            'logout' => ['POST', '/api/auth/logout'],
            'enums' => ['GET', '/api/meta/enums'],
            'index' => ['GET', '/api/projects'],
            'store' => ['POST', '/api/projects'],
            'show' => ['GET', '/api/projects/1'],
            'update' => ['PUT', '/api/projects/1'],
            'destroy' => ['DELETE', '/api/projects/1'],
        ];
    }

    #[DataProvider('protectedEndpoints')]
    public function test_protected_endpoints_return_401_without_a_session(string $method, string $uri): void
    {
        $this->json($method, $uri)
            ->assertUnauthorized()
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }
}
