<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\IndexProjectRequest;
use App\Http\Requests\ProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projects) {}

    public function index(IndexProjectRequest $request): AnonymousResourceCollection
    {
        return ProjectResource::collection($this->projects->list($request->filters()));
    }

    public function show(Project $project): ProjectResource
    {
        return ProjectResource::make($project);
    }

    public function store(ProjectRequest $request): JsonResponse
    {
        $project = $this->projects->create($request->validatedAttributes());

        return ProjectResource::make($project)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED)
            ->header('Location', route('projects.show', $project));
    }

    public function update(ProjectRequest $request, Project $project): ProjectResource
    {
        return ProjectResource::make($this->projects->update($project, $request->validatedAttributes()));
    }

    public function destroy(Project $project): Response
    {
        $this->projects->delete($project);

        return response()->noContent();
    }
}
