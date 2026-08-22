<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class InstantImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_instant_jsonl_import_preserves_ids_links_and_dates(): void
    {
        $dir = storage_path('framework/testing/instant-fixture-' . uniqid());
        File::ensureDirectoryExists($dir . '/entities');
        File::put($dir . '/entities/user.jsonl', json_encode([
            'entity' => ['id' => 'user-1', 'handle' => 'imported', 'email' => 'i@example.com', 'activated' => true],
            'createdAt' => 1700000000000,
        ]) . "\n");
        File::put($dir . '/entities/trip.jsonl', json_encode([
            'entity' => ['id' => 'trip-1', 'title' => 'Imported', 'region' => 'JP', 'currency' => 'JPY', 'originCurrency' => 'USD', 'timeZone' => 'Asia/Tokyo', 'timestampStart' => 1700000000000, 'timestampEnd' => 1700100000000, 'sharingLevel' => 2],
            'createdAt' => 1700000000000,
        ]) . "\n");
        File::put($dir . '/entities/tripUser.jsonl', json_encode([
            'entity' => ['id' => 'membership-1', 'role' => 'owner', 'trip' => 'trip-1', 'user' => 'user-1'],
            'createdAt' => 1700000000000,
        ]) . "\n");

        $this->artisan('instant:import', ['backup' => $dir])->assertExitCode(0);
        $this->assertDatabaseHas('users', ['id' => 'user-1', 'handle' => 'imported']);
        $this->assertDatabaseHas('trips', ['id' => 'trip-1', 'title' => 'Imported']);
        $this->assertDatabaseHas('trip_user', ['id' => 'membership-1', 'trip_id' => 'trip-1', 'user_id' => 'user-1', 'role' => 0]);
        File::deleteDirectory($dir);
    }
}
