<?php

declare(strict_types=1);

namespace Tests\Feature\Database;

use App\Models\Project;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ProjectSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_every_record_from_the_test_data_with_ids_preserved(): void
    {
        $this->seed(ProjectSeeder::class);

        $records = ProjectSeeder::records();

        $this->assertCount(12, $records);
        $this->assertSame(12, Project::count());

        foreach ($records as $record) {
            $project = Project::findOrFail($record['id']);

            $this->assertSame($record['clientName'], $project->client_name);
            $this->assertSame($record['projectName'], $project->project_name);
            $this->assertSame($record['description'], $project->description);
            $this->assertSame($record['status'], $project->status->value);
            $this->assertSame($record['priority'], $project->priority->value);
            $this->assertSame($record['startDate'], $project->start_date?->toDateString());
            $this->assertSame($record['dueDate'], $project->due_date?->toDateString());
        }
    }

    public function test_it_is_idempotent(): void
    {
        $this->seed(ProjectSeeder::class);
        $this->seed(ProjectSeeder::class);

        $this->assertSame(12, Project::count());
    }

    public function test_it_restores_modified_rows_to_the_test_data(): void
    {
        $this->seed(ProjectSeeder::class);
        Project::findOrFail(1)->update(['client_name' => 'Changed']);

        $this->seed(ProjectSeeder::class);

        $this->assertSame('Acme Corporation', Project::findOrFail(1)->client_name);
    }

    public function test_database_seeder_seeds_projects_and_the_demo_user(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(12, Project::count());

        $user = User::where('email', DemoUserSeeder::EMAIL)->sole();
        $this->assertTrue(Hash::check(DemoUserSeeder::PASSWORD, $user->password));
    }
}
