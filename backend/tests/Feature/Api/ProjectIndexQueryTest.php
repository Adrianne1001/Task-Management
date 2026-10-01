<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use Database\Seeders\ProjectSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\AuthenticatesUser;
use Tests\TestCase;

/**
 * Search, filter, sort and pagination on GET /projects, against the seeded test data.
 */
class ProjectIndexQueryTest extends TestCase
{
    use AuthenticatesUser;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(ProjectSeeder::class);
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function index(array $query = []): TestResponse
    {
        return $this->getJson('/api/projects?'.http_build_query($query));
    }

    /**
     * @param  array<string, mixed>  $query
     * @return list<int>
     */
    private function ids(array $query = []): array
    {
        return $this->index($query)->assertOk()->json('data.*.id');
    }

    public function test_default_order_is_by_id(): void
    {
        $this->assertSame(range(1, 12), $this->ids());
    }

    public function test_search_matches_client_name_case_insensitively(): void
    {
        $this->index(['search' => 'acme'])
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.clientName', 'Acme Corporation');
    }

    public function test_search_matches_project_name(): void
    {
        $results = $this->index(['search' => 'website'])->json('data.*.projectName');

        $this->assertNotEmpty($results);
        foreach ($results as $name) {
            $this->assertStringContainsStringIgnoringCase('website', $name);
        }
    }

    public function test_search_with_no_match_returns_an_empty_list(): void
    {
        $this->index(['search' => 'zzz-no-such-project'])
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_search_input_is_treated_as_data_not_sql(): void
    {
        $this->index(['search' => "' OR 1=1 --"])
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_filter_by_status(): void
    {
        $expected = Project::where('status', ProjectStatus::InProgress)->orderBy('id')->pluck('id')->all();

        $this->assertNotEmpty($expected);
        $this->assertSame($expected, $this->ids(['status' => 'In Progress']));
    }

    public function test_filter_by_priority(): void
    {
        $expected = Project::where('priority', ProjectPriority::High)->orderBy('id')->pluck('id')->all();

        $this->assertNotEmpty($expected);
        $this->assertSame($expected, $this->ids(['priority' => 'High']));
    }

    public function test_filters_and_search_combine(): void
    {
        $expected = Project::where('status', ProjectStatus::Planning)
            ->where('priority', ProjectPriority::Medium)
            ->orderBy('id')
            ->pluck('id')
            ->all();

        $this->assertSame($expected, $this->ids(['status' => 'Planning', 'priority' => 'Medium']));
    }

    public function test_sort_by_client_name_ascending_and_descending(): void
    {
        $names = Project::orderBy('client_name')->orderBy('id')->pluck('client_name')->all();

        $this->assertSame($names, $this->index(['sort' => 'clientName'])->json('data.*.clientName'));
        $this->assertSame(
            Project::orderByDesc('client_name')->orderBy('id')->pluck('client_name')->all(),
            $this->index(['sort' => 'clientName', 'direction' => 'desc'])->json('data.*.clientName'),
        );
    }

    public function test_sort_by_due_date(): void
    {
        $dates = $this->index(['sort' => 'dueDate'])->json('data.*.dueDate');

        $sorted = $dates;
        sort($sorted);
        $this->assertSame($sorted, $dates);
    }

    public function test_sort_by_priority_uses_natural_order_not_alphabetical(): void
    {
        $priorities = array_values(array_unique($this->index(['sort' => 'priority'])->json('data.*.priority')));

        $this->assertSame(['Low', 'Medium', 'High'], $priorities);

        $descending = array_values(array_unique(
            $this->index(['sort' => 'priority', 'direction' => 'desc'])->json('data.*.priority'),
        ));
        $this->assertSame(['High', 'Medium', 'Low'], $descending);
    }

    public function test_sort_by_status_uses_workflow_order(): void
    {
        $statuses = array_values(array_unique($this->index(['sort' => 'status'])->json('data.*.status')));

        $expected = array_values(array_intersect(ProjectStatus::values(), $statuses));
        $this->assertSame($expected, $statuses);
    }

    public function test_pagination_is_applied_when_requested(): void
    {
        $this->index(['perPage' => 5, 'page' => 2])
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.id', 6)
            ->assertJsonPath('meta.total', 12)
            ->assertJsonPath('meta.per_page', 5)
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonStructure(['data', 'links', 'meta']);
    }

    public function test_page_alone_uses_the_default_page_size(): void
    {
        $this->index(['page' => 1])
            ->assertOk()
            ->assertJsonCount(12, 'data')
            ->assertJsonPath('meta.per_page', 15);
    }

    public function test_pagination_links_keep_the_query_string(): void
    {
        $next = $this->index(['status' => 'Planning', 'perPage' => 1])->json('links.next');

        $this->assertStringContainsString('status=Planning', urldecode($next));
    }

    /**
     * @return array<string, array{0: array<string, mixed>, 1: string}>
     */
    public static function invalidQueries(): array
    {
        return [
            'unknown status' => [['status' => 'Done'], 'status'],
            'unknown priority' => [['priority' => 'Urgent'], 'priority'],
            'unknown sort column' => [['sort' => 'created_at'], 'sort'],
            'sql in sort' => [['sort' => 'id; DROP TABLE projects'], 'sort'],
            'snake_case sort column' => [['sort' => 'client_name'], 'sort'],
            'unknown direction' => [['direction' => 'sideways'], 'direction'],
            'per page too large' => [['perPage' => 101], 'perPage'],
            'per page zero' => [['perPage' => 0], 'perPage'],
            'page not a number' => [['page' => 'first'], 'page'],
            'search too long' => [['search' => str_repeat('a', 101)], 'search'],
        ];
    }

    #[DataProvider('invalidQueries')]
    public function test_invalid_query_parameters_are_rejected(array $query, string $field): void
    {
        $this->index($query)
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    }

    public function test_invalid_sort_message_lists_allowed_values(): void
    {
        $this->index(['sort' => 'id'])
            ->assertJsonValidationErrors([
                'sort' => 'Sort must be one of: clientName, projectName, status, priority, startDate, dueDate.',
            ]);
    }
}
