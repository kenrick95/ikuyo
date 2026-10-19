<?php

namespace App\Services;

use App\Models\Accommodation;
use App\Models\Activity;
use App\Models\Trip;
use Carbon\CarbonImmutable;
use DateTimeZone;

/** Schedule data only: never serialize notes, members, or booking secrets. */
class TripStructuredData
{
    /** @return list<array<string, mixed>> */
    public function forTrip(Trip $trip): array
    {
        $zone = $this->zone($trip->timezone, 'UTC');
        $tripReference = ['@id' => 'urn:ikuyo:trip:' . rawurlencode($trip->id)];
        $stops = [];
        $legs = [];
        $result = [[
            '@context' => 'https://schema.org',
            '@type' => 'Trip',
            '@id' => 'urn:ikuyo:trip:' . rawurlencode($trip->id),
            'name' => $trip->title,
        ]];

        $activities = Activity::query()->where('trip_id', $trip->id)->orderBy('timestamp_start_ms')->orderBy('id')->get([
            'id', 'title', 'flags', 'timestamp_start_ms', 'timestamp_end_ms', 'timezone_start', 'timezone_end',
            'location', 'location_lat', 'location_lng', 'location_destination', 'location_destination_lat', 'location_destination_lng',
        ]);
        foreach ($activities as $activity) {
            $flags = (int) $activity->flags;
            if ($flags & 2) { // ActivityFlag.IsIdea: not part of the scheduled itinerary.
                continue;
            }
            $flight = (bool) ($flags & 4);
            $train = ! $flight && (bool) ($flags & 8);
            $transport = $flight || $train;
            $item = [
                '@context' => 'https://schema.org',
                '@type' => $flight ? 'Flight' : ($train ? 'TrainTrip' : 'Event'),
                '@id' => 'urn:ikuyo:activity:' . rawurlencode($activity->id),
                'name' => $activity->title,
            ];
            $this->addTime($item, $transport ? 'departureTime' : 'startDate', $activity->timestamp_start_ms, $this->zone($activity->timezone_start, $zone));
            $this->addTime($item, $transport ? 'arrivalTime' : 'endDate', $activity->timestamp_end_ms, $this->zone($activity->timezone_end, $zone));
            $placeType = $flight ? 'Airport' : ($train ? 'TrainStation' : 'Place');
            $origin = $this->place($placeType, $activity->location, $activity->location_lat, $activity->location_lng);
            if ($origin !== null) {
                $item[$flight ? 'departureAirport' : ($train ? 'departureStation' : 'location')] = $origin;
                $this->addStop($stops, $activity->timestamp_start_ms, $origin);
            }
            if ($transport) {
                $item['partOfTrip'] = $tripReference;
                $legs[] = ['@id' => $item['@id']];
                $destination = $this->place($placeType, $activity->location_destination, $activity->location_destination_lat, $activity->location_destination_lng);
                if ($destination !== null) {
                    $item[$flight ? 'arrivalAirport' : 'arrivalStation'] = $destination;
                    $this->addStop($stops, $activity->timestamp_end_ms, $destination);
                }
            }
            $result[] = $item;
        }

        $stays = Accommodation::query()->where('trip_id', $trip->id)->orderBy('check_in_ms')->orderBy('id')->get([
            'id', 'name', 'address', 'check_in_ms', 'check_out_ms', 'tz_check_in', 'tz_check_out', 'location_lat', 'location_lng',
        ]);
        foreach ($stays as $stay) {
            // A planned stay does not establish a reservation or its status.
            $place = $this->place('LodgingBusiness', $stay->name, $stay->location_lat, $stay->location_lng) ?? ['@type' => 'LodgingBusiness'];
            if (trim((string) $stay->address) !== '') {
                $place['address'] = $stay->address;
            }
            $item = [
                '@context' => 'https://schema.org',
                '@type' => 'Event',
                '@id' => 'urn:ikuyo:accommodation:' . rawurlencode($stay->id),
                'name' => $stay->name,
                'location' => $place,
            ];
            $this->addTime($item, 'startDate', $stay->check_in_ms, $this->zone($stay->tz_check_in, $zone));
            $this->addTime($item, 'endDate', $stay->check_out_ms, $this->zone($stay->tz_check_out, $zone));
            if (count($place) > 1) {
                $this->addStop($stops, $stay->check_in_ms, $place);
            }
            $result[] = $item;
        }

        if ($legs !== []) {
            $result[0]['subTrip'] = $legs;
        }
        if ($stops !== []) {
            usort($stops, static fn (array $a, array $b): int => ($a['time'] <=> $b['time']) ?: ($a['order'] <=> $b['order']));
            $result[0]['itinerary'] = [
                '@type' => 'ItemList',
                'numberOfItems' => count($stops),
                'itemListElement' => array_map(static fn (array $stop, int $index): array => [
                    '@type' => 'ListItem', 'position' => $index + 1, 'item' => $stop['place'],
                ], $stops, array_keys($stops)),
            ];
        }

        return $result;
    }

    /**
     * @param  list<array{time: int, order: int, place: array<string, mixed>}>  $stops
     * @param  array<string, mixed>  $place
     */
    private function addStop(array &$stops, mixed $milliseconds, array $place): void
    {
        // Unknown times do not establish a stop's position in an ordered route.
        if ($milliseconds !== null) {
            $stops[] = ['time' => (int) $milliseconds, 'order' => count($stops), 'place' => $place];
        }
    }

    private function zone(?string $zone, string $fallback): string
    {
        if ($zone === null || $zone === '') {
            return $fallback;
        }
        try {
            return (new DateTimeZone($zone))->getName();
        } catch (\Exception) {
            return $fallback;
        }
    }

    /** @param array<string, mixed> $item */
    private function addTime(array &$item, string $key, mixed $milliseconds, string $zone): void
    {
        if ($milliseconds !== null) {
            $item[$key] = CarbonImmutable::createFromTimestampMs((int) $milliseconds, $zone)->toIso8601String();
        }
    }

    /** @return array<string, mixed>|null */
    private function place(string $type, ?string $name, mixed $lat, mixed $lng): ?array
    {
        $place = ['@type' => $type];
        if (trim((string) $name) !== '') {
            $place['name'] = $name;
        }
        if (is_numeric($lat) && is_numeric($lng) && abs((float) $lat) <= 90 && abs((float) $lng) <= 180) {
            $place['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => (float) $lat, 'longitude' => (float) $lng];
        }

        return count($place) > 1 ? $place : null;
    }
}
