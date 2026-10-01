<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Concerns\AuthenticatesUser;
use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    use AuthenticatesUser;
    use RefreshDatabase;

    private function assertBaseSecurityHeaders(TestResponse $response): TestResponse
    {
        return $response
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('Permissions-Policy');
    }

    public function test_api_responses_carry_security_headers_and_a_strict_csp(): void
    {
        $this->assertBaseSecurityHeaders($this->getJson('/api/projects'))
            ->assertHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_error_responses_for_unmatched_routes_carry_security_headers(): void
    {
        $this->assertBaseSecurityHeaders($this->getJson('/api/does-not-exist')->assertNotFound());
    }

    public function test_hsts_is_sent_only_over_https(): void
    {
        $this->getJson('https://localhost/api/projects')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    public function test_web_pages_get_base_headers_but_not_the_api_csp(): void
    {
        $this->assertBaseSecurityHeaders($this->get('/'))
            ->assertHeaderMissing('Content-Security-Policy');
    }
}
