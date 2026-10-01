<?php

declare(strict_types=1);

namespace Tests\Unit\Enums;

use App\Enums\ProjectPriority;
use App\Enums\ProjectSortField;
use App\Enums\ProjectStatus;
use App\Enums\SortDirection;
use PHPUnit\Framework\TestCase;
use ValueError;

class EnumTest extends TestCase
{
    public function test_project_status_values_match_the_specification(): void
    {
        $this->assertSame(['Planning', 'In Progress', 'On Hold', 'Completed'], ProjectStatus::values());
    }

    public function test_project_priority_values_match_the_specification(): void
    {
        $this->assertSame(['Low', 'Medium', 'High'], ProjectPriority::values());
    }

    public function test_values_for_humans_lists_values_comma_separated(): void
    {
        $this->assertSame('Planning, In Progress, On Hold, Completed', ProjectStatus::valuesForHumans());
        $this->assertSame('Low, Medium, High', ProjectPriority::valuesForHumans());
    }

    public function test_label_is_the_display_value(): void
    {
        $this->assertSame('In Progress', ProjectStatus::InProgress->label());
        $this->assertSame('High', ProjectPriority::High->label());
    }

    public function test_from_is_case_sensitive_and_rejects_unknown_status(): void
    {
        $this->expectException(ValueError::class);

        ProjectStatus::from('in progress');
    }

    public function test_from_rejects_unknown_priority(): void
    {
        $this->expectException(ValueError::class);

        ProjectPriority::from('Urgent');
    }

    public function test_every_sort_field_maps_to_a_snake_case_column(): void
    {
        $this->assertSame(
            ['clientName', 'projectName', 'status', 'priority', 'startDate', 'dueDate'],
            ProjectSortField::values(),
        );
        $this->assertSame('client_name', ProjectSortField::ClientName->column());
        $this->assertSame('due_date', ProjectSortField::DueDate->column());

        foreach (ProjectSortField::cases() as $field) {
            $this->assertMatchesRegularExpression('/^[a-z]+(_[a-z]+)*$/', $field->column());
        }
    }

    public function test_sort_direction_values(): void
    {
        $this->assertSame(['asc', 'desc'], SortDirection::values());
        $this->assertNull(SortDirection::tryFrom('DROP TABLE'));
    }
}
