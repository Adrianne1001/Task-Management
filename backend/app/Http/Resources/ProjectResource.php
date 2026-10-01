<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Http\Requests\ProjectRequest;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * API representation of a project; keys match test_data.json exactly.
 *
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'clientName' => $this->client_name,
            'projectName' => $this->project_name,
            'description' => $this->description,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'startDate' => $this->start_date?->format(ProjectRequest::DATE_FORMAT),
            'dueDate' => $this->due_date?->format(ProjectRequest::DATE_FORMAT),
        ];
    }
}
