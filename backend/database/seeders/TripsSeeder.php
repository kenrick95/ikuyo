<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Comment;
use App\Models\Trip;
use App\Models\User;

class TripsSeeder
{
    public function run(): void
    {
        $alice = User::create(['name' => 'Alice', 'email' => 'alice@example.com', 'password' => 'secret']);
        $bob = User::create(['name' => 'Bob', 'email' => 'bob@example.com', 'password' => 'secret']);

        $trip = Trip::create([
            'title'             => 'Kyoto Itinerary',
            'region'            => 'JP',
            'currency'          => 'JPY',
            'timezone'          => 'Asia/Tokyo',
            'timestamp_start_ms' => strtotime('2026-04-01') * 1000,
            'timestamp_end_ms'   => strtotime('2026-04-07') * 1000,
            'sharing_level'      => 3,
        ]);

        // Attach users via the pivot with extra `role` data.
        $trip->users()->attach($alice, ['role' => 'owner']);
        $trip->users()->attach($bob, ['role' => 'viewer']);

        // Add child activities.
        $activity = $trip->activities()->create([
            'title'     => 'Fushimi Inari',
            'location'  => 'Kyoto',
            'description' => 'Torii gates hike',
            'timestamp_start_ms' => strtotime('2024-04-02 09:00') * 1000,
        ]);
        $trip->activities()->create(['title' => 'Gion district', 'location' => 'Kyoto', 'description' => 'Evening walk']);

        // Polymorphic comment: same table, different owner.
        $trip->comments()->create(['user_id' => $alice->id, 'content' => 'Book the shinkansen early']);
        $activity->comments()->create(['user_id' => $bob->id, 'content' => 'Start before 7am']);
    }
}