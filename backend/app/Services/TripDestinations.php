<?php

namespace App\Services;

use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * @phpstan-type DestinationInput array{id: string, name: string, region: string, timeZone: string, currency: string, startsOn: string, startsAtTime?: string|null, startOffset?: string|null, startsAtMs?: int}
 * @phpstan-type Destination array{id: string, name: string, region: string, timeZone: string, currency: string, startsOn: string, startsAtTime?: string|null, startOffset: string|null, startsAtMs: int}
 */
class TripDestinations
{
    public const RULES = [
        'destinations' => ['sometimes', 'array', 'list', 'max:100'],
        'destinations.*' => ['array:id,name,region,timeZone,currency,startsOn,startsAtTime,startOffset,startsAtMs'],
        'destinations.*.id' => ['required', 'uuid', 'distinct'],
        'destinations.*.name' => ['required', 'string', 'max:120'],
        'destinations.*.region' => ['required', 'regex:/^[A-Z]{2}$/'],
        'destinations.*.timeZone' => ['required', 'timezone:all_with_bc'],
        'destinations.*.currency' => ['required', 'regex:/^[A-Z]{3}$/'],
        'destinations.*.startsOn' => ['required', 'date_format:Y-m-d'],
        'destinations.*.startsAtTime' => ['nullable', 'date_format:H:i'],
        'destinations.*.startOffset' => ['nullable', 'regex:/^[+-][0-9]{2}:[0-9]{2}$/'],
        'destinations.*.startsAtMs' => ['sometimes', 'integer'],
    ];

    /**
     * @param  list<DestinationInput>  $destinations
     * @return list<Destination>
     */
    public static function resolve(array $destinations, int $start, int $end): array
    {
        $seen = [];
        foreach ($destinations as $index => &$destination) {
            try {
                ExpenseMoney::exponent($destination['currency']);
            } catch (ValidationException) {
                throw ValidationException::withMessages([
                    "destinations.$index.currency" => 'Choose a supported currency.',
                ]);
            }

            $zone = new DateTimeZone($destination['timeZone']);
            $date = $destination['startsOn'];
            $time = $destination['startsAtTime'] ?? null;
            $offset = $destination['startOffset'] ?? null;
            $wallTime = $date . ' ' . ($time ?? '00:00');
            $instant = new DateTimeImmutable($wallTime, $zone);
            $wallTimestamp = (new DateTimeImmutable($wallTime, new DateTimeZone('UTC')))->getTimestamp();
            $transitions = $zone->getTransitions($wallTimestamp - 172800, $wallTimestamp + 172800) ?: [];

            if ($time === null) {
                // A date begins at the first real instant of that local day.
                foreach ($transitions as $transition) {
                    $candidate = (new DateTimeImmutable('@' . $transition['ts']))->setTimezone($zone);
                    if ($candidate->format('Y-m-d') === $date && $candidate < $instant) {
                        $instant = $candidate;
                    }
                    $candidate = (new DateTimeImmutable('@' . ($wallTimestamp - $transition['offset'])))->setTimezone($zone);
                    if ($candidate->format('Y-m-d H:i') === $wallTime && $candidate < $instant) {
                        $instant = $candidate;
                    }
                }
                if ($instant->format('Y-m-d') !== $date) {
                    self::invalid($index, $destination, 'Choose a date that exists in this time zone.');
                }
                $startOffset = null;
            } else {
                $candidates = [];
                foreach (array_unique(array_column($transitions, 'offset')) as $seconds) {
                    $candidate = (new DateTimeImmutable('@' . ($wallTimestamp - $seconds)))->setTimezone($zone);
                    if ($candidate->format('Y-m-d H:i') === $wallTime) {
                        $candidates[$candidate->format('P')] = $candidate;
                    }
                }
                if ($candidates === []) {
                    self::invalid($index, $destination, 'Choose a time that exists in this time zone.');
                }
                if (count($candidates) > 1 && ! isset($candidates[$offset])) {
                    self::invalid($index, $destination, 'Choose a UTC offset for this repeated time.');
                }
                $instant = $candidates[$offset] ?? reset($candidates);
                $startOffset = count($candidates) > 1 ? $offset : null;
            }

            $ms = $instant->getTimestamp() * 1000;
            if ($ms <= $start || $ms >= $end) {
                self::invalid($index, $destination, 'Choose a start after the trip begins and before it ends.');
            }
            if (isset($seen[$ms])) {
                self::invalid($index, $destination, 'Choose a different start for each destination.');
            }
            $seen[$ms] = true;
            $destination['startsAtMs'] = $ms;
            $destination['startOffset'] = $startOffset;
        }
        unset($destination);

        usort($destinations, fn ($first, $second) => $first['startsAtMs'] <=> $second['startsAtMs']);

        return $destinations;
    }

    /**
     * @param  list<Destination>  $destinations
     * @return list<Destination>
     */
    public static function duplicate(array $destinations, int $days, int $start, int $end): array
    {
        foreach ($destinations as &$destination) {
            $destination['id'] = (string) Str::uuid();
            $date = new DateTimeImmutable($destination['startsOn'], new DateTimeZone('UTC'));
            $destination['startsOn'] = $date->modify(sprintf('%+d days', $days))->format('Y-m-d');
        }
        unset($destination);

        return self::resolve($destinations, $start, $end);
    }

    /** @param DestinationInput $destination */
    private static function invalid(int $index, array $destination, string $message): never
    {
        throw ValidationException::withMessages([
            "destinations.$index.startsOn" => $destination['name'] . ' — ' . $message,
        ]);
    }
}
