<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state, matching the migrated users table.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id' => (string) Str::uuid(),
            'handle' => 'user_' . strtolower(Str::random(10)),
            'handle_key' => null,
            'email' => fake()->unique()->safeEmail(),
            'auth_namespace_id' => null,
            'activated' => true,
            'last_login_at' => null,
            'created_at_ms' => (int) round(microtime(true) * 1000),
            'updated_at_ms' => (int) round(microtime(true) * 1000),
        ];
    }
}