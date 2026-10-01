<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ProjectPriority;
use App\Enums\ProjectSortField;
use App\Enums\ProjectStatus;
use App\Enums\SortDirection;
use Illuminate\Http\JsonResponse;

/**
 * Exposes the backend enums so the frontend builds its options from a single source of truth.
 */
class MetaController extends Controller
{
    public function enums(): JsonResponse
    {
        return response()->json([
            'data' => [
                'statuses' => ProjectStatus::values(),
                'priorities' => ProjectPriority::values(),
                'sortFields' => ProjectSortField::values(),
                'sortDirections' => SortDirection::values(),
            ],
        ]);
    }
}
