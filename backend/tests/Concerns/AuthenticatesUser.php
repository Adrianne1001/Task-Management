<?php

declare(strict_types=1);

namespace Tests\Concerns;

use App\Models\User;

/**
 * Signs a fresh user in before each test, for endpoints behind auth:sanctum.
 * Laravel calls setUp{TraitName}() automatically, after RefreshDatabase.
 */
trait AuthenticatesUser
{
    protected function setUpAuthenticatesUser(): void
    {
        $this->actingAs(User::factory()->create());
    }
}
