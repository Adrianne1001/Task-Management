<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Database\Seeders\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\AuthenticatesUser;
use Tests\TestCase;

class ProjectCrudTest extends TestCase
{
    use AuthenticatesUser;
    use RefreshDatabase;

    private const RESOURCE_KEYS = [
        'id', 'clientName', 'projectName', 'description', 'status', 'priority', 'startDate', 'dueDate',
    ];

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'clientName' => 'Acme Corporation',
            'projectName' => 'Corporate Website Redesign',
            'description' => 'Redesign and modernize the corporate website.',
            'status' => ProjectStatus::InProgress->value,
            'priority' => ProjectPriority::High->value,
            'startDate' => '2026-06-01',
            'dueDate' => '2026-07-15',
        ], $overrides);
    }

    public function test_index_returns_seeded_projects_exactly_as_in_test_data(): void
    {
        $this->seed(ProjectSeeder::class);
        $expected = json_decode(file_get_contents(database_path('data/projects.json')), true);

        $this->getJson('/api/projects')
            ->assertOk()
            ->assertExactJson(['data' => $expected]);
    }

    public function test_index_returns_an_empty_list_when_there_are_no_projects(): void
    {
        $this->getJson('/api/projects')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_show_returns_a_single_project(): void
    {
        $project = Project::factory()->create();

        $this->getJson("/api/projects/{$project->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $project->id)
            ->assertJsonPath('data.clientName', $project->client_name)
            ->assertJsonPath('data.status', $project->status->value)
            ->assertJsonStructure(['data' => self::RESOURCE_KEYS]);
    }

    public function test_resource_keys_match_the_specification_exactly(): void
    {
        $project = Project::factory()->create();

        $keys = array_keys($this->getJson("/api/projects/{$project->id}")->json('data'));

        $this->assertSame(self::RESOURCE_KEYS, $keys);
    }

    public function test_show_returns_404_for_a_missing_project(): void
    {
        $this->getJson('/api/projects/999')->assertNotFound();
    }

    public function test_show_returns_404_for_a_non_numeric_id(): void
    {
        $this->getJson('/api/projects/abc')->assertNotFound();
    }

    public function test_store_creates_a_project(): void
    {
        $response = $this->postJson('/api/projects', $this->payload());

        $project = Project::sole();

        $response->assertCreated()
            ->assertHeader('Location', route('projects.show', $project))
            ->assertExactJson(['data' => ['id' => $project->id, ...$this->payload()]]);

        $this->assertDatabaseHas('projects', [
            'client_name' => 'Acme Corporation',
            'status' => 'In Progress',
            'priority' => 'High',
        ]);
    }

    public function test_store_accepts_a_project_without_description_or_dates(): void
    {
        $payload = $this->payload();
        unset($payload['description'], $payload['startDate'], $payload['dueDate']);

        $this->postJson('/api/projects', $payload)
            ->assertCreated()
            ->assertJsonPath('data.description', null)
            ->assertJsonPath('data.startDate', null)
            ->assertJsonPath('data.dueDate', null);
    }

    public function test_store_ignores_unknown_and_guarded_fields(): void
    {
        $this->postJson('/api/projects', $this->payload(['id' => 500, 'createdAt' => '2000-01-01']))
            ->assertCreated();

        $this->assertDatabaseMissing('projects', ['id' => 500]);
    }

    public function test_update_replaces_a_project(): void
    {
        $project = Project::factory()->create();

        $payload = $this->payload([
            'projectName' => 'Renamed',
            'status' => ProjectStatus::Completed->value,
            'priority' => ProjectPriority::Low->value,
        ]);

        $this->putJson("/api/projects/{$project->id}", $payload)
            ->assertOk()
            ->assertExactJson(['data' => ['id' => $project->id, ...$payload]]);

        $project->refresh();
        $this->assertSame('Renamed', $project->project_name);
        $this->assertSame(ProjectStatus::Completed, $project->status);
    }

    public function test_update_clears_optional_fields_that_are_omitted(): void
    {
        $project = Project::factory()->create(['description' => 'Old description']);

        $payload = $this->payload();
        unset($payload['description'], $payload['startDate'], $payload['dueDate']);

        $this->putJson("/api/projects/{$project->id}", $payload)->assertOk();

        $project->refresh();
        $this->assertNull($project->description);
        $this->assertNull($project->start_date);
        $this->assertNull($project->due_date);
    }

    public function test_update_returns_404_for_a_missing_project(): void
    {
        $this->putJson('/api/projects/999', $this->payload())->assertNotFound();
    }

    public function test_update_returns_422_for_invalid_data(): void
    {
        $project = Project::factory()->create();

        $this->putJson("/api/projects/{$project->id}", $this->payload(['clientName' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('clientName');
    }

    public function test_patch_is_not_supported(): void
    {
        $project = Project::factory()->create();

        $this->patchJson("/api/projects/{$project->id}", $this->payload())
            ->assertStatus(405);
    }

    public function test_destroy_deletes_a_project(): void
    {
        $project = Project::factory()->create();

        $this->deleteJson("/api/projects/{$project->id}")
            ->assertNoContent();

        $this->assertModelMissing($project);
    }

    public function test_destroy_returns_404_for_a_missing_project(): void
    {
        $this->deleteJson('/api/projects/999')->assertNotFound();
    }
}
