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
            'trip' => ['id' => 'tr1', 'title' => 'Trip', 'region' => 'JP', 'currency' => 'JPY', 'originCurrency' => 'USD', 'timeZone' => 'Asia/Tokyo', 'timestampStart' => 1000, 'timestampEnd' => 2000, 'sharingLevel' => 3, 'tripUser' => ['tu1'], 'accommodation' => ['ac1'], 'activity' => ['a1'], 'macroplan' => ['m1'], 'expense' => ['e1'], 'taskList' => ['tl1'], 'commentGroup' => ['cg1']],
            'tripUser' => ['id' => 'tu1', 'role' => 'owner'],
            'activity' => ['id' => 'a1', 'title' => 'Activity', 'location' => 'Kyoto', 'description' => 'Walk'],
            'accommodation' => ['id' => 'ac1', 'name' => 'Hotel', 'address' => 'Kyoto', 'timestampCheckIn' => 1000, 'timestampCheckOut' => 2000],
            'macroplan' => ['id' => 'm1', 'name' => 'North', 'notes' => '', 'timestampStart' => 1000, 'timestampEnd' => 2000],
            'expense' => ['id' => 'e1', 'title' => 'Train', 'description' => '', 'amount' => 100, 'amountInOriginCurrency' => 1, 'currency' => 'JPY', 'currencyConversionFactor' => 1, 'timestampIncurred' => 1000],
            'taskList' => ['id' => 'tl1', 'title' => 'Todo', 'index' => 0, 'status' => 0, 'task' => ['t1']],
            'task' => ['id' => 't1', 'title' => 'Book', 'description' => '', 'index' => 0, 'status' => 0],
            'commentGroup' => ['id' => 'cg1', 'status' => 0, 'comment' => ['c1']],
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

    public function test_orphaned_trip_user_is_skipped_without_failing(): void
    {
        $dir = storage_path('framework/testing/instant-orphan-' . uniqid());
        File::ensureDirectoryExists($dir . '/entities');
        File::put($dir . '/entities/user.jsonl', json_encode(['entity' => ['id' => 'u1', 'handle' => 'alice', 'activated' => true, 'tripUser' => ['tu-valid', 'tu-only-user']], 'createdAt' => 1700000000000]) . "\n");
        File::put($dir . '/entities/trip.jsonl', json_encode(['entity' => ['id' => 'tr1', 'title' => 'Trip', 'region' => 'JP', 'currency' => 'JPY', 'timeZone' => 'Asia/Tokyo', 'timestampStart' => 1, 'timestampEnd' => 2, 'sharingLevel' => 0, 'tripUser' => ['tu-valid', 'tu-only-trip']], 'createdAt' => 1700000000000]) . "\n");
        File::put($dir . '/entities/tripUser.jsonl', json_encode(['entity' => ['id' => 'tu-valid', 'role' => 'owner'], 'createdAt' => 1700000000000]) . "\n" . json_encode(['entity' => ['id' => 'tu-only-user', 'role' => 'viewer'], 'createdAt' => 1700000000000]) . "\n" . json_encode(['entity' => ['id' => 'tu-only-trip', 'role' => 'viewer'], 'createdAt' => 1700000000000]) . "\n");

        $this->artisan('instant:import', ['backup' => $dir])->assertExitCode(0);
        $this->assertDatabaseHas('trip_user', ['id' => 'tu-valid', 'trip_id' => 'tr1', 'user_id' => 'u1']);
        $this->assertDatabaseMissing('trip_user', ['id' => 'tu-only-user']);
        $this->assertDatabaseMissing('trip_user', ['id' => 'tu-only-trip']);
        File::deleteDirectory($dir);
    }
}
