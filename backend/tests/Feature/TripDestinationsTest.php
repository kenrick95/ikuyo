<?php

namespace Tests\Feature;

use App\Models\User;
use DateTimeImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TripDestinationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_destinations_save_in_chronological_order_and_can_be_removed(): void
    {
        $this->signIn();
        $taipei = $this->destination();
        $return = array_replace($taipei, [
            'id' => (string) Str::uuid(), 'name' => 'Tokyo', 'region' => 'JP',
            'timeZone' => 'Asia/Tokyo', 'currency' => 'JPY', 'startsOn' => '2026-11-06',
        ]);
        $trip = $this->postJson('/api/trips', $this->trip([$return, $taipei]))
            ->assertCreated()
            ->assertJsonPath('destinations.0.name', 'Taipei')
            ->assertJsonPath('destinations.0.startsAtMs', $this->ms('2026-11-02 15:40:00+08:00'))
            ->assertJsonPath('destinationRevision', 0)
            ->json('id');

        $this->putJson("/api/trips/$trip", ['title' => 'Updated title'])
            ->assertOk()->assertJsonCount(2, 'destinations');
        $this->putJson("/api/trips/$trip", ['destinations' => [$taipei], 'destinationRevision' => 0])
            ->assertOk()->assertJsonPath('destinationRevision', 1);
        $this->putJson("/api/trips/$trip", ['destinations' => [], 'destinationRevision' => 0])
            ->assertConflict();
        $this->putJson("/api/trips/$trip", ['timestampEnd' => $this->ms('2026-11-02 09:00:00+09:00')])
            ->assertUnprocessable()->assertJsonValidationErrors('destinations.0.startsOn');
        $this->putJson("/api/trips/$trip", ['destinations' => [], 'destinationRevision' => 1])
            ->assertOk()->assertJsonCount(0, 'destinations');
    }

    public function test_repeated_time_requires_an_offset_and_a_gap_is_rejected(): void
    {
        $this->signIn();
        $ny = array_replace($this->destination(), [
            'name' => 'New York', 'region' => 'US', 'timeZone' => 'America/New_York',
            'currency' => 'USD', 'startsOn' => '2026-11-01', 'startsAtTime' => '01:30',
        ]);
        $this->postJson('/api/trips', $this->trip([$ny]))->assertUnprocessable()
            ->assertJsonValidationErrors('destinations.0.startsOn');
        $ny['startOffset'] = '-05:00';
        $this->postJson('/api/trips', $this->trip([$ny]))->assertCreated()
            ->assertJsonPath('destinations.0.startsAtMs', $this->ms('2026-11-01T06:30:00Z'));
        $ny['startsOn'] = '2026-03-08';
        $ny['startsAtTime'] = '02:30';
        $this->postJson('/api/trips', array_replace($this->trip([$ny]), ['timestampStart' => $this->ms('2026-03-01T00:00:00Z')]))
            ->assertUnprocessable()->assertJsonValidationErrors('destinations.0.startsOn');
    }

    public function test_duplication_shifts_destination_dates_in_their_local_zone(): void
    {
        $this->signIn();
        $stop = $this->destination();
        $trip = $this->postJson('/api/trips', $this->trip([$stop]))->assertCreated()->json('id');
        $copy = $this->postJson("/api/trips/$trip/duplicate", [
            'title' => 'December trip',
            'startDateMs' => $this->ms('2026-11-30 00:00:00+09:00'),
            'endDateMs' => $this->ms('2026-12-08 00:00:00+09:00'),
        ])->assertCreated()->json('id');
        $this->getJson("/api/trips/$copy")->assertOk()
            ->assertJsonPath('destinations.0.startsOn', '2026-12-03')
            ->assertJsonPath('destinations.0.startsAtTime', '15:40')
            ->assertJsonMissing(['id' => $stop['id']]);
    }

    private function signIn(): void
    {
        $this->actingAs(User::create([
            'id' => (string) Str::uuid(), 'handle' => 'owner', 'email' => 'owner@example.test',
            'password_hash' => password_hash('password', PASSWORD_DEFAULT), 'activated' => true,
        ]));
    }

    private function destination(): array
    {
        return [
            'id' => (string) Str::uuid(), 'name' => 'Taipei', 'region' => 'TW',
            'timeZone' => 'Asia/Taipei', 'currency' => 'TWD',
            'startsOn' => '2026-11-02', 'startsAtTime' => '15:40',
        ];
    }

    private function trip(array $stops): array
    {
        return [
            'title' => 'Japan and Taiwan', 'region' => 'JP', 'currency' => 'JPY',
            'originCurrency' => 'SGD', 'timeZone' => 'Asia/Tokyo',
            'timestampStart' => $this->ms('2026-10-30 00:00:00+09:00'),
            'timestampEnd' => $this->ms('2026-11-07 00:00:00+09:00'),
            'destinations' => $stops,
        ];
    }

    private function ms(string $value): int
    {
        return (new DateTimeImmutable($value))->getTimestamp() * 1000;
    }
}
