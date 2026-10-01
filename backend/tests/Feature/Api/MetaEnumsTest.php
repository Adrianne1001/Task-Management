<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use Tests\TestCase;

class MetaEnumsTest extends TestCase
{
    public function test_enums_endpoint_lists_allowed_values(): void
    {
        $this->getJson('/api/meta/enums')
            ->assertOk()
            ->assertExactJson([
                'data' => [
                    'statuses' => ['Planning', 'In Progress', 'On Hold', 'Completed'],
                    'priorities' => ['Low', 'Medium', 'High'],
                    'sortFields' => ['clientName', 'projectName', 'status', 'priority', 'startDate', 'dueDate'],
                    'sortDirections' => ['asc', 'desc'],
                ],
            ]);
    }
}
