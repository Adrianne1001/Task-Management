<?php

declare(strict_types=1);

namespace App\Enums;

use App\Enums\Concerns\HasValues;

/**
 * Whitelist of sortable fields for the project list.
 *
 * Values are the camelCase names exposed by the API; column() maps each one
 * to its database column, so user input never reaches ORDER BY directly.
 */
enum ProjectSortField: string
{
    use HasValues;

    case ClientName = 'clientName';
    case ProjectName = 'projectName';
    case Status = 'status';
    case Priority = 'priority';
    case StartDate = 'startDate';
    case DueDate = 'dueDate';

    public function column(): string
    {
        return match ($this) {
            self::ClientName => 'client_name',
            self::ProjectName => 'project_name',
            self::Status => 'status',
            self::Priority => 'priority',
            self::StartDate => 'start_date',
            self::DueDate => 'due_date',
        };
    }

    /**
     * For enum-backed fields, the values in their natural order (e.g. Low,
     * Medium, High) so sorting is meaningful rather than alphabetical.
     *
     * @return list<string>|null
     */
    public function orderedValues(): ?array
    {
        return match ($this) {
            self::Status => ProjectStatus::values(),
            self::Priority => ProjectPriority::values(),
            default => null,
        };
    }
}
