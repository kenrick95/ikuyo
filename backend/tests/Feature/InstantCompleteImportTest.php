<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class InstantCompleteImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_fixture_imports_all_application_entities(): void
    {
        $dir = storage_path('framework/testing/instant-complete-' . uniqid());
        File::ensureDirectoryExists($dir . '/entities');
        $records = [
            'user' => ['id' => 'u1', 'handle' => 'alice', 'email' => 'alice@example.com', 'activated' => true, 'tripUser' => ['tu1']],
            'trip' => ['id' => 'tr1', 'title' => 'Trip', 'region' => 'JP', 'currency' => 'JPY', 'originCurrency' => 'USD', 'timeZone' => 'Asia/Tokyo', 'timestampStart' => 1000, 'timestampEnd' => 2000, 'sharingLevel' => 3, 'tripUser' => ['tu1']],
            'tripUser' => ['id' => 'tu1', 'role' => 'owner'],
            'activity' => ['id' => 'a1', 'title' => 'Activity', 'location' => 'Kyoto', 'description' => 'Walk', 'trip' => 'tr1'],
            'accommodation' => ['id' => 'ac1', 'name' => 'Hotel', 'address' => 'Kyoto', 'trip' => 'tr1', 'timestampCheckIn' => 1000, 'timestampCheckOut' => 2000],
            'macroplan' => ['id' => 'm1', 'name' => 'North', 'notes' => '', 'trip' => 'tr1', 'timestampStart' => 1000, 'timestampEnd' => 2000],
            'expense' => ['id' => 'e1', 'title' => 'Train', 'description' => '', 'trip' => 'tr1', 'amount' => 100, 'amountInOriginCurrency' => 1, 'currency' => 'JPY', 'currencyConversionFactor' => 1, 'timestampIncurred' => 1000],
            'taskList' => ['id' => 'tl1', 'title' => 'Todo', 'index' => 0, 'status' => 0, 'trip' => 'tr1'],
            'task' => ['id' => 't1', 'title' => 'Book', 'description' => '', 'index' => 0, 'status' => 0, 'taskList' => 'tl1'],
            'commentGroup' => ['id' => 'cg1', 'status' => 0, 'trip' => 'tr1'],
            'commentGroupObject' => ['id' => 'cgo1', 'commentGroup' => ['cg1'], 'type' => 'activity', 'activity' => ['a1']],
            'comment' => ['id' => 'c1', 'content' => 'Early start', 'commentGroup' => ['cg1'], 'user' => ['u1']],
        ];
        foreach ($records as $entity => $data) {
            File::put($dir . '/entities/' . $entity . '.jsonl', json_encode(['entity' => $data, 'createdAt' => 1700000000000]) . "\n");
        }

        $this->artisan('instant:import', ['backup' => $dir])->assertExitCode(0);
        foreach (['users' => 'u1', 'trips' => 'tr1', 'trip_user' => 'tu1', 'activities' => 'a1', 'accommodations' => 'ac1', 'macro_plans' => 'm1', 'expenses' => 'e1', 'task_lists' => 'tl1', 'tasks' => 't1', 'comment_groups' => 'cg1', 'comment_group_objects' => 'cgo1', 'comments' => 'c1'] as $table => $id) {
            $this->assertDatabaseHas($table, ['id' => $id]);
        }
        $this->assertDatabaseHas('comment_group_objects', ['object_type' => 1, 'object_id' => 'a1']);
        File::deleteDirectory($dir);
    }
}
