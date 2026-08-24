<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\CommentGroup;
use App\Models\CommentGroupObject;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TripGraphContractTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_trip_graph_matches_frontend_contract(): void
    {
        $user = User::create([
            'id' => (string) Str::uuid(), 'handle' => 'owner', 'email' => 'owner@example.com',
            'password_hash' => password_hash('password', PASSWORD_DEFAULT), 'activated' => true,
        ]);
        $trip = Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Contract trip', 'region' => 'JP', 'currency' => 'JPY',
            'origin_currency' => 'USD', 'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 1,
            'timestamp_end_ms' => 2, 'sharing_level' => 0,
        ]);
        $trip->users()->attach($user->id, ['id' => (string) Str::uuid(), 'role' => 0, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $list = $trip->taskLists()->create(['id' => (string) Str::uuid(), 'title' => 'Tasks', 'index' => 0, 'status' => 0]);
        $list->tasks()->create(['id' => (string) Str::uuid(), 'title' => 'Book', 'description' => '', 'index' => 0, 'status' => 0]);
        $group = CommentGroup::create(['id' => (string) Str::uuid(), 'trip_id' => $trip->id, 'status' => 0]);
        CommentGroupObject::create(['id' => $group->id, 'comment_group_id' => $group->id, 'object_type' => 0, 'object_id' => $trip->id]);
        Comment::create(['id' => (string) Str::uuid(), 'comment_group_id' => $group->id, 'user_id' => $user->id, 'content' => 'Hello']);

        $response = $this->actingAs($user)->getJson('/api/trips/' . $trip->id);
        $response->assertOk()->assertJsonStructure([
            'id', 'title', 'timestampStart', 'timestampEnd', 'timeZone', 'region', 'currency',
            'originCurrency', 'sharingLevel', 'createdAt', 'lastUpdatedAt',
            'activity', 'accommodation', 'macroplan', 'expense',
            'taskList' => [['id', 'title', 'index', 'status', 'task' => [['id', 'title', 'index', 'status']]]],
            'tripUser' => [['id', 'role', 'user' => ['id', 'handle', 'activated', 'email']]],
            'commentGroup' => [['id', 'status', 'createdAt', 'lastUpdatedAt', 'comment', 'object']],
        ]);
    }
}
