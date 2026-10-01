<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use DateTimeImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * Validates the body of POST /projects and PUT /projects/{id}.
 *
 * PUT is a full replacement, so both actions share the same rules: optional
 * fields that are omitted are stored as null.
 */
class ProjectRequest extends FormRequest
{
    public const DATE_FORMAT = 'Y-m-d';

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $date = 'date_format:'.self::DATE_FORMAT;

        return [
            'clientName' => ['required', 'string', 'max:'.Project::CLIENT_NAME_MAX_LENGTH],
            'projectName' => ['required', 'string', 'max:'.Project::PROJECT_NAME_MAX_LENGTH],
            'description' => ['nullable', 'string', 'max:'.Project::DESCRIPTION_MAX_LENGTH],
            'status' => ['required', Rule::enum(ProjectStatus::class)],
            'priority' => ['required', Rule::enum(ProjectPriority::class)],
            'startDate' => ['nullable', $date],
            'dueDate' => [
                'nullable',
                $date,
                // Compare only against a start date that is itself valid; otherwise
                // the start date's own error is the meaningful one.
                Rule::when($this->hasValidDate('startDate'), 'after_or_equal:startDate'),
            ],
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
            'startDate.date_format' => 'The start date must be a valid date in YYYY-MM-DD format.',
            'dueDate.date_format' => 'The due date must be a valid date in YYYY-MM-DD format.',
            'dueDate.after_or_equal' => 'The due date cannot be earlier than the start date.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'clientName' => 'client name',
            'projectName' => 'project name',
            'startDate' => 'start date',
            'dueDate' => 'due date',
        ];
    }

    /**
     * The validated input mapped to the model's snake_case attributes.
     *
     * Every attribute is present, so a PUT fully replaces the project.
     *
     * @return array<string, mixed>
     */
    public function validatedAttributes(): array
    {
        return [
            'client_name' => $this->validated('clientName'),
            'project_name' => $this->validated('projectName'),
            'description' => $this->validated('description'),
            'status' => ProjectStatus::from($this->validated('status')),
            'priority' => ProjectPriority::from($this->validated('priority')),
            'start_date' => $this->validated('startDate'),
            'due_date' => $this->validated('dueDate'),
        ];
    }

    private function hasValidDate(string $key): bool
    {
        $value = $this->input($key);

        if (! is_string($value)) {
            return false;
        }

        $date = DateTimeImmutable::createFromFormat('!'.self::DATE_FORMAT, $value);

        return $date !== false && $date->format(self::DATE_FORMAT) === $value;
    }
}
