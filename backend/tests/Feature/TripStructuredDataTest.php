<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TripStructuredDataTest extends TestCase
{
    use RefreshDatabase;

    private function trip(int $sharing = 2): Trip
    {
        return Trip::create([
            'id' => (string) Str::uuid(), 'title' => 'Tokyo trip', 'region' => 'JP', 'currency' => 'JPY',
            'origin_currency' => 'USD', 'timezone' => 'Asia/Tokyo', 'timestamp_start_ms' => 0,
            'timestamp_end_ms' => 1, 'sharing_level' => $sharing,
        ]);
    }

    private function user(): User
    {
        return User::create([
            'id' => (string) Str::uuid(), 'handle' => 'viewer', 'email' => 'viewer@example.com',
            'password_hash' => password_hash('password', PASSWORD_DEFAULT), 'activated' => true,
        ]);
    }

    public function test_public_page_metadata_and_download_share_schedule_data(): void
    {
        $trip = $this->trip();
        $trip->activities()->create([
            'id' => 'flight', 'title' => 'Flight to Tokyo', 'location' => 'Singapore',
            'location_destination' => 'Tokyo', 'location_lat' => 0, 'location_lng' => 0,
            'description' => 'secret booking reference', 'flags' => 4,
            'timestamp_start_ms' => CarbonImmutable::parse('2026-10-25T02:00:00Z')->getTimestampMs(),
            'timestamp_end_ms' => CarbonImmutable::parse('2026-10-25T09:00:00Z')->getTimestampMs(),
            'timezone_start' => 'Asia/Singapore', 'timezone_end' => 'Asia/Tokyo',
        ]);
        $trip->activities()->create([
            'id' => 'train', 'title' => 'Train', 'location' => 'Tokyo Station',
            'location_destination' => 'Kyoto Station', 'flags' => 8,
            'timestamp_start_ms' => 0, 'timezone_start' => 'Invalid/Zone',
        ]);
        $trip->activities()->create(['id' => 'walk', 'title' => 'Walk', 'location' => 'Park']);
        $trip->activities()->create(['id' => 'idea', 'title' => 'Unscheduled idea', 'location' => '', 'flags' => 2]);
        $deleted = $trip->activities()->create(['id' => 'deleted', 'title' => 'Deleted activity', 'location' => '']);
        $deleted->delete();
        $trip->accommodations()->create([
            'id' => 'hotel', 'name' => 'Hotel', 'address' => 'Tokyo address', 'notes' => 'secret room code',
            'check_in_ms' => 0, 'check_out_ms' => 86400000,
        ]);
        $this->trip(0)->activities()->create(['id' => 'other-trip', 'title' => 'Other trip data', 'location' => '']);

        $download = $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')
            ->assertOk()->assertHeader('Content-Type', 'application/ld+json')
            ->assertHeader('Content-Disposition', 'attachment; filename="ikuyo-trip.jsonld"');
        $this->assertStringContainsString('no-store', $download->headers->get('Cache-Control'));
        $data = $download->json();
        $this->assertCount(5, $data); // Trip, three activities, and a stay.
        $byName = array_column($data, null, 'name');
        $this->assertSame('Trip', $byName['Tokyo trip']['@type']);
        $this->assertSame('Flight', $byName['Flight to Tokyo']['@type']);
        $this->assertSame('2026-10-25T10:00:00+08:00', $byName['Flight to Tokyo']['departureTime']);
        $this->assertSame('2026-10-25T18:00:00+09:00', $byName['Flight to Tokyo']['arrivalTime']);
        $this->assertSame('Airport', $byName['Flight to Tokyo']['departureAirport']['@type']);
        $this->assertEquals(0, $byName['Flight to Tokyo']['departureAirport']['geo']['latitude']);
        $this->assertSame('TrainTrip', $byName['Train']['@type']);
        $this->assertSame('TrainStation', $byName['Train']['arrivalStation']['@type']);
        $this->assertSame('1970-01-01T09:00:00+09:00', $byName['Train']['departureTime']);
        $this->assertArrayNotHasKey('arrivalTime', $byName['Train']);
        $this->assertSame('Event', $byName['Walk']['@type']);
        $this->assertArrayNotHasKey('startDate', $byName['Walk']);
        $this->assertSame('LodgingBusiness', $byName['Hotel']['location']['@type']);
        $this->assertSame('Tokyo address', $byName['Hotel']['location']['address']);
        $this->assertStringNotContainsString('secret', $download->getContent());
        $this->assertStringNotContainsString('Other trip data', $download->getContent());
        $this->assertStringNotContainsString('Reservation', $download->getContent());
        $metadata = $this->getJson('/api/metadata/trips/' . $trip->id)->assertOk();
        $this->assertSame($data, $metadata->json('structuredData'));
        $this->assertStringContainsString('no-store', $metadata->headers->get('Cache-Control'));
    }

    public function test_private_export_requires_access_but_allows_an_invited_viewer_and_archived_trips(): void
    {
        $trip = $this->trip(0);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertUnauthorized();
        $viewer = $this->user();
        $this->actingAs($viewer)->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertForbidden();
        $trip->users()->attach($viewer->id, ['id' => (string) Str::uuid(), 'role' => 2, 'created_at_ms' => 1, 'updated_at_ms' => 1]);
        $trip->update(['archived_at_ms' => 1]);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertOk();
        $this->getJson('/api/metadata/trips/' . $trip->id)->assertNotFound();
        $trip->users()->detach($viewer->id);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertForbidden();
    }

    public function test_public_exports_follow_visibility_changes_and_soft_deletion(): void
    {
        $trip = $this->trip(3);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertOk();
        $trip->update(['sharing_level' => 0]);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertUnauthorized();
        $this->getJson('/api/metadata/trips/' . $trip->id)->assertNotFound();
        $trip->delete();
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertNotFound();
    }

    public function test_times_use_each_endpoint_zone_across_daylight_saving_changes(): void
    {
        $trip = $this->trip();
        $trip->activities()->create([
            'id' => 'dst', 'title' => 'DST event', 'location' => 'Berlin',
            'timestamp_start_ms' => CarbonImmutable::parse('2026-10-25T00:30:00Z')->getTimestampMs(),
            'timestamp_end_ms' => CarbonImmutable::parse('2026-10-25T01:30:00Z')->getTimestampMs(),
            'timezone_start' => 'Europe/Berlin', 'timezone_end' => 'Europe/Berlin',
        ]);
        $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertOk()
            ->assertJsonPath('1.startDate', '2026-10-25T02:30:00+02:00')
            ->assertJsonPath('1.endDate', '2026-10-25T02:30:00+01:00');
    }

    public function test_invalid_trip_zone_falls_back_to_utc_and_empty_locations_are_omitted(): void
    {
        $trip = $this->trip();
        $trip->update(['timezone' => 'Invalid/Zone']);
        $trip->activities()->create([
            'id' => 'invalid', 'title' => 'No location', 'location' => '',
            'timestamp_start_ms' => 0, 'location_lat' => 91, 'location_lng' => 0,
        ]);
        $response = $this->getJson('/api/trips/' . $trip->id . '/export/jsonld')->assertOk();
        $response->assertJsonPath('1.startDate', '1970-01-01T00:00:00+00:00');
        $this->assertArrayNotHasKey('location', $response->json('1'));
    }
}
