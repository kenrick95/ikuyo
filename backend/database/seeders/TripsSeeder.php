<?php

namespace Database\Seeders;

use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TripsSeeder extends Seeder
{
    public function run(): void
    {
        $alice = User::create([
            'id' => (string) Str::uuid(),
            'handle' => 'alice_demo',
            'handle_key' => 'alice_demo',
            'email' => 'alice@example.com',
            'password_hash' => password_hash('secret', PASSWORD_DEFAULT),
            'activated' => true,
        ]);
        $bob = User::create([
            'id' => (string) Str::uuid(),
            'handle' => 'bob_demo',
            'handle_key' => 'bob_demo',
            'email' => 'bob@example.com',
            'password_hash' => password_hash('secret', PASSWORD_DEFAULT),
            'activated' => true,
        ]);

        $trip = Trip::create([
            'id' => (string) Str::uuid(),
            'title' => 'Kyoto Itinerary',
            'region' => 'JP',
            'currency' => 'JPY',
            'timezone' => 'Asia/Tokyo',
            'timestamp_start_ms' => strtotime('2026-04-01') * 1000,
            'timestamp_end_ms' => strtotime('2026-04-07') * 1000,
            'sharing_level' => 3,
        ]);

        $trip->users()->attach($alice->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => nowMs(), 'updated_at_ms' => nowMs()]);
        $trip->users()->attach($bob->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => nowMs(), 'updated_at_ms' => nowMs()]);

        $activity = $trip->activities()->create([
            'id' => (string) Str::uuid(),
            'title' => 'Fushimi Inari',
            'location' => 'Kyoto',
            'description' => 'Torii gates hike',
            'timestamp_start_ms' => strtotime('2026-04-02 09:00') * 1000,
        ]);
        $trip->activities()->create([
            'id' => (string) Str::uuid(),
            'title' => 'Gion district',
            'location' => 'Kyoto',
            'description' => 'Evening walk',
        ]);

        $group = CommentGroup::create([
            'id' => (string) Str::uuid(),
            'trip_id' => $trip->id,
            'status' => 0,
        ]);
        CommentGroupObject::create([
            'id' => $group->id,
            'comment_group_id' => $group->id,
            'object_type' => 0,
            'object_id' => $trip->id,
        ]);
        $group->comments()->create([
            'id' => (string) Str::uuid(),
            'content' => 'Book the shinkansen early',
            'user_id' => $alice->id,
        ]);
    }
}

function nowMs(): int
{
    return (int) round(microtime(true) * 1000);
}
