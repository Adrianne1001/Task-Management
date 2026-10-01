<?php

declare(strict_types=1);

namespace App\Services;

use App\Data\ProjectFilters;
use App\Enums\ProjectPriority;
use App\Enums\ProjectSortField;
use App\Enums\ProjectStatus;
use App\Enums\SortDirection;
use App\Models\Project;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Project queries and persistence, kept out of the controller.
 */
class ProjectService
{
    /**
     * @return Collection<int, Project>|LengthAwarePaginator<int, Project>
     */
    public function list(ProjectFilters $filters): Collection|LengthAwarePaginator
    {
        $query = Project::query()
            ->when($filters->search, fn (Builder $query, string $search) => $this->applySearch($query, $search))
            ->when($filters->status, fn (Builder $query, ProjectStatus $status) => $query->where('status', $status))
            ->when($filters->priority, fn (Builder $query, ProjectPriority $priority) => $query->where('priority', $priority))
            ->when($filters->sort, fn (Builder $query, ProjectSortField $sort) => $this->applySort($query, $sort, $filters->direction))
            // Tie-breaker for equal sort keys, and the default order when unsorted.
            ->orderBy('id');

        return $filters->isPaginated()
            ? $query->paginate($filters->perPage)->withQueryString()
            : $query->get();
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(array $attributes): Project
    {
        return Project::create($attributes);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Project $project, array $attributes): Project
    {
        $project->update($attributes);

        return $project;
    }

    public function delete(Project $project): void
    {
        $project->delete();
    }

    /**
     * Case-insensitive match on client or project name (parameter-bound LIKE).
     *
     * @param  Builder<Project>  $query
     */
    private function applySearch(Builder $query, string $search): void
    {
        $term = '%'.$search.'%';

        $query->where(fn (Builder $query) => $query
            ->where('client_name', 'like', $term)
            ->orWhere('project_name', 'like', $term));
    }

    /**
     * Enum columns sort by their declared order (Low < Medium < High) rather
     * than alphabetically, using a CASE expression that works on MySQL and
     * SQLite alike. The column and direction come from enums and the enum
     * values are bound, so no user input is interpolated.
     *
     * @param  Builder<Project>  $query
     */
    private function applySort(Builder $query, ProjectSortField $sort, SortDirection $direction): void
    {
        $orderedValues = $sort->orderedValues();

        if ($orderedValues === null) {
            $query->orderBy($sort->column(), $direction->value);

            return;
        }

        $whens = implode(' ', array_map(
            fn (int $position): string => "WHEN ? THEN {$position}",
            array_keys($orderedValues),
        ));

        $query->orderByRaw("CASE {$sort->column()} {$whens} END {$direction->value}", $orderedValues);
    }
}
