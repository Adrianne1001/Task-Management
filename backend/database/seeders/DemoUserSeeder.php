<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds a single demo account for local review of the app.
 *
 * Credentials are documented in the README; never run this in production.
 */
class DemoUserSeeder extends Seeder
{
    public const EMAIL = 'demo@example.com';

    public const PASSWORD = 'password';

    public function run(): void
    {
        User::updateOrCreate(
            ['email' => self::EMAIL],
            ['name' => 'Demo User', 'password' => self::PASSWORD],
        );
    }
}
