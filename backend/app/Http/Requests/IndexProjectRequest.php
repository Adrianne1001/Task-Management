<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Data\ProjectFilters;
use App\Enums\ProjectPriority;
use App\Enums\ProjectSortField;
use App\Enums\ProjectStatus;
use App\Enums\SortDirection;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * Validates the query string of GET /projects.
 *
 * Every option is whitelisted (enum-backed or bounded), so nothing the client
 * sends reaches a WHERE or ORDER BY clause unchecked.
 */
class IndexProjectRequest extends FormRequest
{
    public const SEARCH_MAX_LENGTH = 100;

    public const DEFAULT_PER_PAGE = 15;

    public const MAX_PER_PAGE = 100;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:'.self::SEARCH_MAX_LENGTH],
            'status' => ['nullable', Rule::enum(ProjectStatus::class)],
            'priority' => ['nullable', Rule::enum(ProjectPriority::class)],
            'sort' => ['nullable', Rule::enum(ProjectSortField::class)],
            'direction' => ['nullable', Rule::enum(SortDirection::class)],
            'page' => ['nullable', 'integer', 'min:1'],
            'perPage' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.'.Enum::class => 'Status must be one of: '.ProjectStatus::valuesForHumans().'.',
            'priority.'.Enum::class => 'Priority must be one of: '.ProjectPriority::valuesForHumans().'.',
            'sort.'.Enum::class => 'Sort must be one of: '.ProjectSortField::valuesForHumans().'.',
            'direction.'.Enum::class => 'Direction must be one of: '.SortDirection::valuesForHumans().'.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'perPage' => 'per page',
        ];
    }

    /**
     * The validated query as a typed filter object. Results are paginated only
     * when the client asks for a page or page size.
     */
    public function filters(): ProjectFilters
    {
        $paginated = $this->filled('page') || $this->filled('perPage');

        return new ProjectFilters(
            search: $this->validated('search'),
            status: ProjectStatus::tryFrom((string) $this->validated('status')),
            priority: ProjectPriority::tryFrom((string) $this->validated('priority')),
            sort: ProjectSortField::tryFrom((string) $this->validated('sort')),
            direction: SortDirection::tryFrom((string) $this->validated('direction')) ?? SortDirection::Asc,
            perPage: $paginated ? (int) ($this->validated('perPage') ?? self::DEFAULT_PER_PAGE) : null,
        );
    }
}
