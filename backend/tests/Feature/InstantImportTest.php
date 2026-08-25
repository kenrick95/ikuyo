<?php

namespace Tests\Feature;

use App\Models\User;
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

    public function test_import_trims_emails_and_dedupes_normalized_duplicates(): void
    {
        // Simulates InstantDB quirks found in prod: emails with trailing whitespace,
        // and two distinct users that normalize to the same email (which MySQL's
        // case/space-insensitive unique collation would reject as a duplicate).
        $dir = storage_path('framework/testing/instant-fixture-' . uniqid());
        File::ensureDirectoryExists($dir . '/entities');
        File::put($dir . '/entities/user.jsonl', implode("\n", [
            json_encode(['entity' => ['id' => 'u-a', 'handle' => 'alice', 'email' => 'alice@example.com ', 'activated' => true, 'createdAt' => 1700000000000, 'lastUpdatedAt' => 1700000000001]]),
            json_encode(['entity' => ['id' => 'u-b', 'handle' => 'bob', 'email' => 'ALICE@example.com', 'activated' => true, 'createdAt' => 1700000000000, 'lastUpdatedAt' => 1700000000001]]),
            json_encode(['entity' => ['id' => 'u-c', 'handle' => 'carol', 'email' => 'carol@example.com', 'activated' => true, 'createdAt' => 1700000000000, 'lastUpdatedAt' => 1700000000001]]),
        ]));

        $this->artisan('instant:import', ['backup' => $dir])->assertExitCode(0);
        // u-a's trailing space is trimmed.
        $this->assertDatabaseHas('users', ['id' => 'u-a', 'email' => 'alice@example.com']);
        // u-b normalizes to the same email; must be aliased, not rejected.
        $this->assertDatabaseHas('users', ['id' => 'u-b']);
        $bob = User::find('u-b');
        $this->assertNotSame('alice@example.com', $bob->email);
        $this->assertStringContainsString('@', $bob->email);
        $this->assertDatabaseHas('users', ['id' => 'u-c', 'email' => 'carol@example.com']);
        File::deleteDirectory($dir);
    }

    public function test_import_dedupes_colliding_handles(): void
    {
        // Two distinct users with the same normalized handle collide on
        // users_handle_unique; the later one must be suffixed, not rejected.
        $dir = storage_path('framework/testing/instant-fixture-' . uniqid());
        File::ensureDirectoryExists($dir . '/entities');
        File::put($dir . '/entities/user.jsonl', implode("\n", [
            json_encode(['entity' => ['id' => 'h-a', 'handle' => 'shafiulmiah_gmail_com', 'email' => 'a@example.com', 'activated' => true, 'createdAt' => 1700000000000, 'lastUpdatedAt' => 1700000000001]]),
            json_encode(['entity' => ['id' => 'h-b', 'handle' => 'shafiulmiah_gmail_com', 'email' => 'b@example.com', 'activated' => true, 'createdAt' => 1700000000000, 'lastUpdatedAt' => 1700000000001]]),
        ]));

        $this->artisan('instant:import', ['backup' => $dir])->assertExitCode(0);
        $b = User::find('h-b');
        $this->assertNotSame('shafiulmiah_gmail_com', $b->handle);
        $this->assertNotSame('shafiulmiah_gmail_com', $b->handle_key);
        $this->assertStringContainsString('shafiulmiah_gmail_com_', $b->handle);
        $this->assertDatabaseHas('users', ['id' => 'h-a', 'handle' => 'shafiulmiah_gmail_com']);
        File::deleteDirectory($dir);
    }
}
