<?php

namespace App\Services;

use Illuminate\Validation\ValidationException;

/**
 * @phpstan-type Destination array{id: string, name: string, region: string, timeZone: string, currency: string, startsOn: string, startsAtTime?: string|null, startOffset?: string|null, startsAtMs: int}
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
        'destinations.*.startsAtMs' => ['required', 'integer:strict'],
    ];

    /**
     * @param  list<Destination>  $destinations
     * @return list<Destination>
     */
    public static function validateAndSort(array $destinations, int $start, int $end): array
    {
        $seen = [];
        foreach ($destinations as $index => $destination) {
            try {
                ExpenseMoney::exponent($destination['currency']);
            } catch (ValidationException) {
                throw ValidationException::withMessages([
                    "destinations.$index.currency" => 'Choose a supported currency.',
                ]);
            }

            $ms = $destination['startsAtMs'];
            if ($ms <= $start || $ms >= $end) {
                self::invalid($index, $destination, 'Choose a start after the trip begins and before it ends.');
            }
            if (isset($seen[$ms])) {
                self::invalid($index, $destination, 'Choose a different start for each destination.');
            }
            $seen[$ms] = true;
        }

        usort($destinations, fn ($first, $second) => $first['startsAtMs'] <=> $second['startsAtMs']);

        return $destinations;
    }

    /** @param Destination $destination */
    private static function invalid(int $index, array $destination, string $message): never
    {
        throw ValidationException::withMessages([
            "destinations.$index.startsOn" => $destination['name'] . ' — ' . $message,
        ]);
    }
}
