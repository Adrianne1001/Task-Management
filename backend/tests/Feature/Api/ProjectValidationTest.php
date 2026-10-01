<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\AuthenticatesUser;
use Tests\TestCase;

class ProjectValidationTest extends TestCase
{
    use AuthenticatesUser;
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'clientName' => 'Acme Corporation',
            'projectName' => 'Corporate Website Redesign',
            'description' => 'Redesign and modernize the corporate website.',
            'status' => 'Planning',
            'priority' => 'Medium',
            'startDate' => '2026-06-01',
            'dueDate' => '2026-07-15',
        ], $overrides);
    }

    /**
     * @return array<string, array{0: array<string, mixed>, 1: string, 2: string}>
     */
    public static function invalidPayloads(): array
    {
        return [
            'missing client name' => [['clientName' => null], 'clientName', 'The client name field is required.'],
            'blank client name' => [['clientName' => '   '], 'clientName', 'The client name field is required.'],
            'client name too long' => [['clientName' => str_repeat('a', Project::CLIENT_NAME_MAX_LENGTH + 1)], 'clientName', 'The client name field must not be greater than 150 characters.'],
            'client name not a string' => [['clientName' => ['Acme']], 'clientName', 'The client name field must be a string.'],
            'missing project name' => [['projectName' => null], 'projectName', 'The project name field is required.'],
            'project name too long' => [['projectName' => str_repeat('a', Project::PROJECT_NAME_MAX_LENGTH + 1)], 'projectName', 'The project name field must not be greater than 150 characters.'],
            'description too long' => [['description' => str_repeat('a', Project::DESCRIPTION_MAX_LENGTH + 1)], 'description', 'The description field must not be greater than 2000 characters.'],
            'missing status' => [['status' => null], 'status', 'The status field is required.'],
            'invalid status' => [['status' => 'Done'], 'status', 'Status must be one of: Planning, In Progress, On Hold, Completed.'],
            'status with wrong case' => [['status' => 'in progress'], 'status', 'Status must be one of: Planning, In Progress, On Hold, Completed.'],
            'missing priority' => [['priority' => null], 'priority', 'The priority field is required.'],
            'invalid priority' => [['priority' => 'Urgent'], 'priority', 'Priority must be one of: Low, Medium, High.'],
            'bad start date format' => [['startDate' => '01/06/2026'], 'startDate', 'The start date must be a valid date in YYYY-MM-DD format.'],
            'impossible start date' => [['startDate' => '2026-02-30'], 'startDate', 'The start date must be a valid date in YYYY-MM-DD format.'],
            'start date with time' => [['startDate' => '2026-06-01T10:00:00'], 'startDate', 'The start date must be a valid date in YYYY-MM-DD format.'],
            'bad due date format' => [['dueDate' => 'tomorrow'], 'dueDate', 'The due date must be a valid date in YYYY-MM-DD format.'],
            'due date before start date' => [['startDate' => '2026-06-10', 'dueDate' => '2026-06-09'], 'dueDate', 'The due date cannot be earlier than the start date.'],
        ];
    }

    #[DataProvider('invalidPayloads')]
    public function test_store_rejects_invalid_input(array $overrides, string $field, string $message): void
    {
        $this->postJson('/api/projects', $this->payload($overrides))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);

        $this->assertDatabaseCount('projects', 0);
    }

    #[DataProvider('invalidPayloads')]
    public function test_update_rejects_invalid_input(array $overrides, string $field, string $message): void
    {
        $project = Project::factory()->create();

        $this->putJson("/api/projects/{$project->id}", $this->payload($overrides))
            ->assertUnprocessable()
            ->assertJsonValidationErrors([$field => $message]);
    }

    /**
     * @return array<string, array{0: array<string, mixed>}>
     */
    public static function validPayloads(): array
    {
        return [
            'due date equal to start date' => [['startDate' => '2026-06-01', 'dueDate' => '2026-06-01']],
            'only start date' => [['startDate' => '2026-06-01', 'dueDate' => null]],
            'only due date' => [['startDate' => null, 'dueDate' => '2026-06-01']],
            'no dates' => [['startDate' => null, 'dueDate' => null]],
            'empty date strings' => [['startDate' => '', 'dueDate' => '']],
            'no description' => [['description' => null]],
            'names at max length' => [[
                'clientName' => str_repeat('a', Project::CLIENT_NAME_MAX_LENGTH),
                'projectName' => str_repeat('b', Project::PROJECT_NAME_MAX_LENGTH),
            ]],
            'leap day' => [['startDate' => '2028-02-29', 'dueDate' => '2028-03-01']],
        ];
    }

    #[DataProvider('validPayloads')]
    public function test_store_accepts_valid_edge_cases(array $overrides): void
    {
        $this->postJson('/api/projects', $this->payload($overrides))->assertCreated();
    }

    public function test_invalid_start_date_does_not_also_flag_the_due_date(): void
    {
        $this->postJson('/api/projects', $this->payload(['startDate' => 'not-a-date']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('startDate')
            ->assertJsonMissingValidationErrors('dueDate');
    }

    public function test_names_are_trimmed(): void
    {
        $this->postJson('/api/projects', $this->payload(['clientName' => '  Acme  ']))
            ->assertCreated()
            ->assertJsonPath('data.clientName', 'Acme');
    }

    public function test_all_errors_are_reported_together(): void
    {
        $this->postJson('/api/projects', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['clientName', 'projectName', 'status', 'priority'])
            ->assertJsonStructure(['message', 'errors']);
    }
}
