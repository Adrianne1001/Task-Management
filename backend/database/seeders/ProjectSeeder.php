<?php

namespace Database\Seeders;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * Seeds the projects table from the assessment's test data.
 *
 * Ids are preserved and the seeder is idempotent (upsert on id). Invalid
 * status/priority values throw instead of being silently stored.
 */
class ProjectSeeder extends Seeder
{
    public const DATA_PATH = 'data/projects.json';

    public function run(): void
    {
        $rows = array_map($this->toAttributes(...), self::records());

        Project::upsert($rows, uniqueBy: ['id']);
    }

    /**
     * The raw camelCase records from the JSON file.
     *
     * @return list<array<string, mixed>>
     */
    public static function records(): array
    {
        return File::json(database_path(self::DATA_PATH), JSON_THROW_ON_ERROR);
    }

    /**
     * Map one camelCase record to snake_case column values.
     *
     * @param  array<string, mixed>  $record
     * @return array<string, mixed>
     */
    private function toAttributes(array $record): array
    {
        return [
            'id' => $record['id'],
            'client_name' => $record['clientName'],
            'project_name' => $record['projectName'],
            'description' => $record['description'] ?? null,
            'status' => ProjectStatus::from($record['status'])->value,
            'priority' => ProjectPriority::from($record['priority'])->value,
            'start_date' => $record['startDate'] ?? null,
            'due_date' => $record['dueDate'] ?? null,
        ];
    }
}
