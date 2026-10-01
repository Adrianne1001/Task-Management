<?php

declare(strict_types=1);

namespace Tests\Feature\Database;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_status_and_priority_are_cast_to_enums(): void
    {
        $project = Project::factory()
            ->status(ProjectStatus::OnHold)
            ->priority(ProjectPriority::Low)
            ->create()
            ->fresh();

        $this->assertSame(ProjectStatus::OnHold, $project->status);
        $this->assertSame(ProjectPriority::Low, $project->priority);
    }

    public function test_dates_serialize_as_plain_y_m_d(): void
    {
        $project = Project::factory()->create(['start_date' => '2026-06-01', 'due_date' => '2026-07-15']);

        $array = $project->fresh()->toArray();

        $this->assertSame('2026-06-01', $array['start_date']);
        $this->assertSame('2026-07-15', $array['due_date']);
    }

    public function test_only_whitelisted_attributes_are_mass_assignable(): void
    {
        $project = new Project(['id' => 999, 'client_name' => 'Acme', 'created_at' => '2000-01-01']);

        $this->assertNull($project->id);
        $this->assertNull($project->created_at);
        $this->assertSame('Acme', $project->client_name);
    }

    public function test_factory_due_date_is_never_before_start_date(): void
    {
        Project::factory()->count(50)->create();

        Project::all()->each(function (Project $project): void {
            $this->assertTrue($project->due_date->greaterThanOrEqualTo($project->start_date));
        });
    }

    public function test_dates_are_nullable(): void
    {
        $project = Project::factory()->withoutDates()->create()->fresh();

        $this->assertNull($project->start_date);
        $this->assertNull($project->due_date);
    }
}
