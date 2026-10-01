<?php

namespace Database\Factories;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * The due date is always on or after the start date.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = Carbon::instance(fake()->dateTimeBetween('-3 months', '+3 months'))->startOfDay();

        return [
            'client_name' => fake()->company(),
            'project_name' => fake()->catchPhrase(),
            'description' => fake()->optional()->sentence(),
            'status' => fake()->randomElement(ProjectStatus::cases()),
            'priority' => fake()->randomElement(ProjectPriority::cases()),
            'start_date' => $startDate->toDateString(),
            'due_date' => $startDate->copy()->addDays(fake()->numberBetween(0, 120))->toDateString(),
        ];
    }

    public function status(ProjectStatus $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }

    public function priority(ProjectPriority $priority): static
    {
        return $this->state(fn () => ['priority' => $priority]);
    }

    public function withoutDates(): static
    {
        return $this->state(fn () => ['start_date' => null, 'due_date' => null]);
    }

    public function withoutStartDate(): static
    {
        return $this->state(fn () => ['start_date' => null]);
    }

    public function withoutDueDate(): static
    {
        return $this->state(fn () => ['due_date' => null]);
    }
}
