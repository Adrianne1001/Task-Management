<?php

declare(strict_types=1);

namespace App\Data;

use App\Enums\ProjectPriority;
use App\Enums\ProjectSortField;
use App\Enums\ProjectStatus;
use App\Enums\SortDirection;

/**
 * Validated search, filter, sort and pagination options for the project list.
 */
final readonly class ProjectFilters
{
    public function __construct(
        public ?string $search = null,
        public ?ProjectStatus $status = null,
        public ?ProjectPriority $priority = null,
        public ?ProjectSortField $sort = null,
        public SortDirection $direction = SortDirection::Asc,
        public ?int $perPage = null,
    ) {}

    public function isPaginated(): bool
    {
        return $this->perPage !== null;
    }
}
