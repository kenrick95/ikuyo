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

    public function test_new_destinations_require_opt_in_and_existing_destinations_stay_editable(): void
    {
        $user = $this->signIn(experimental: false);
        $stop = $this->destination();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.experimentalFeatures', false);
        $this->postJson('/api/trips', $this->trip([$stop]))->assertForbidden();
        $trip = $this->postJson('/api/trips', $this->trip([]))->assertCreated()->json('id');
        $this->putJson("/api/trips/$trip", ['destinations' => [$stop]])->assertForbidden();

        $this->putJson('/api/users/me/preferences', ['experimentalFeatures' => true])
            ->assertOk()->assertJsonPath('experimentalFeatures', true);
        $this->putJson('/api/users/me/preferences', ['currency' => 'SGD'])
            ->assertOk()->assertJsonPath('experimentalFeatures', true);
        $user->refresh();
        $this->getJson('/api/auth/me')->assertOk()->assertJsonPath('user.experimentalFeatures', true);
        $this->putJson("/api/trips/$trip", ['destinations' => [$stop]])->assertOk();

        $this->putJson('/api/users/me/preferences', ['experimentalFeatures' => false])
            ->assertOk()->assertJsonPath('experimentalFeatures', false);
        $this->getJson("/api/trips/$trip")->assertOk()->assertJsonPath('destinations.0.id', $stop['id']);
        $this->putJson("/api/trips/$trip", ['destinations' => [array_replace($stop, ['name' => 'Taipei City'])]])
            ->assertOk()->assertJsonPath('destinations.0.name', 'Taipei City');
        $this->putJson("/api/trips/$trip", ['destinations' => [array_replace($stop, ['id' => (string) Str::uuid()])]])
            ->assertForbidden();
        $this->postJson("/api/trips/$trip/duplicate", [
            'title' => 'Copy',
            'startDateMs' => $this->ms('2026-10-30 00:00:00+09:00'),
            'endDateMs' => $this->ms('2026-11-07 00:00:00+09:00'),
        ])->assertForbidden();
        $this->putJson("/api/trips/$trip", ['destinations' => []])->assertOk()->assertJsonCount(0, 'destinations');
    }

    public function test_destinations_save_in_chronological_order_and_can_be_removed(): void
    {
        $this->signIn();
        $taipei = $this->destination();
        $return = array_replace($taipei, [
            'id' => (string) Str::uuid(), 'name' => 'Tokyo', 'region' => 'JP',
            'timeZone' => 'Asia/Tokyo', 'currency' => 'JPY', 'startsOn' => '2026-11-06',
            'startsAtMs' => $this->ms('2026-11-06 15:40:00+09:00'),
        ]);
        $trip = $this->postJson('/api/trips', $this->trip([$return, $taipei]))
            ->assertCreated()
            ->assertJsonPath('destinations.0.name', 'Taipei')
            ->assertJsonPath('destinations.0.startsAtMs', $this->ms('2026-11-02 15:40:00+08:00'))
            ->json('id');

        $this->putJson("/api/trips/$trip", ['title' => 'Updated title'])
            ->assertOk()->assertJsonCount(2, 'destinations');
        $this->putJson("/api/trips/$trip", ['destinations' => [$taipei]])
            ->assertOk()->assertJsonCount(1, 'destinations');
        $this->putJson("/api/trips/$trip", ['timestampEnd' => $this->ms('2026-11-02 09:00:00+09:00')])
            ->assertUnprocessable()->assertJsonValidationErrors('destinations.0.startsOn');
        $this->putJson("/api/trips/$trip", ['destinations' => []])
            ->assertOk()->assertJsonCount(0, 'destinations');
    }

    public function test_start_instants_are_required_preserved_and_unique(): void
    {
        $this->signIn();
        $ny = array_replace($this->destination(), [
            'name' => 'New York', 'region' => 'US', 'timeZone' => 'America/New_York',
            'currency' => 'USD', 'startsOn' => '2026-11-01', 'startsAtTime' => '01:30',
        ]);
        $ny['startOffset'] = '-05:00';
        unset($ny['startsAtMs']);
        $this->postJson('/api/trips', $this->trip([$ny]))->assertUnprocessable()
            ->assertJsonValidationErrors('destinations.0.startsAtMs');

        // Persist the client instant even if this server would resolve it differently.
        $ny['startsAtMs'] = $this->ms('2026-11-01T06:29:00Z');
        $this->postJson('/api/trips', $this->trip([$ny]))->assertCreated()
            ->assertJsonPath('destinations.0.startsAtMs', $ny['startsAtMs'])
            ->assertJsonPath('destinations.0.startOffset', '-05:00');
        $this->postJson('/api/trips', $this->trip([$ny, array_replace($ny, ['id' => (string) Str::uuid()])]))
            ->assertUnprocessable()->assertJsonValidationErrors('destinations.1.startsOn');
    }

    public function test_duplication_preserves_submitted_destination_starts_with_fresh_ids(): void
    {
        $this->signIn();
        $stop = $this->destination();
        $trip = $this->postJson('/api/trips', $this->trip([$stop]))->assertCreated()->json('id');
        $options = [
            'title' => 'December trip',
            'startDateMs' => $this->ms('2026-11-30 00:00:00+09:00'),
            'endDateMs' => $this->ms('2026-12-08 00:00:00+09:00'),
        ];
        $this->postJson("/api/trips/$trip/duplicate", $options)
            ->assertUnprocessable()->assertJsonValidationErrors('destinations');

        $shifted = array_replace($stop, [
            'startsOn' => '2026-12-03',
            'startsAtMs' => $this->ms('2026-12-03 15:40:00+08:00'),
        ]);
        $copy = $this->postJson("/api/trips/$trip/duplicate", $options + ['destinations' => [$shifted]])
            ->assertCreated()->json('id');
        $this->getJson("/api/trips/$copy")->assertOk()
            ->assertJsonPath('destinations.0.startsOn', '2026-12-03')
            ->assertJsonPath('destinations.0.startsAtTime', '15:40')
            ->assertJsonPath('destinations.0.startsAtMs', $shifted['startsAtMs'])
            ->assertJsonMissing(['id' => $stop['id']]);

        $sameDatesCopy = $this->postJson("/api/trips/$trip/duplicate", [
            'title' => 'Same dates',
            'startDateMs' => $this->ms('2026-10-30 00:00:00+09:00'),
            'endDateMs' => $this->ms('2026-11-07 00:00:00+09:00'),
        ])->assertCreated()->json('id');
        $this->getJson("/api/trips/$sameDatesCopy")->assertOk()
            ->assertJsonPath('destinations.0.startsAtMs', $stop['startsAtMs']);
    }

    private function signIn(bool $experimental = true): User
    {
        $user = User::create([
            'id' => (string) Str::uuid(), 'handle' => 'owner', 'email' => 'owner@example.test',
            'password_hash' => password_hash('password', PASSWORD_DEFAULT), 'activated' => true,
        ]);
        if ($experimental) {
            $user->update(['experimental_features' => true]);
        }
        $this->actingAs($user);

        return $user;
    }

    private function destination(): array
    {
        return [
            'id' => (string) Str::uuid(), 'name' => 'Taipei', 'region' => 'TW',
            'timeZone' => 'Asia/Taipei', 'currency' => 'TWD',
            'startsOn' => '2026-11-02', 'startsAtTime' => '15:40',
            'startsAtMs' => $this->ms('2026-11-02 15:40:00+08:00'),
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
