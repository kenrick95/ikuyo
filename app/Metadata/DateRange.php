<?php

declare(strict_types=1);

namespace App\Metadata;

use DateTimeImmutable;
use DateTimeZone;
use Exception;

/**
 * Formats a trip's date range the same way the frontend does
 * (`src/Trip/time.ts` `formatTripDateRange`), e.g. "1–15 December 2025".
 */
final class DateRange
{
    /**
     * @param int $startMs epoch milliseconds
     * @param int $endMs   epoch milliseconds (exclusive final day)
     */
    public function __invoke(int $startMs, int $endMs, string $timeZone): string
    {
        if ($startMs <= 0 || $endMs <= 0) {
            return '';
        }
        $tz = $this->timeZone($timeZone);
        $start = (new DateTimeImmutable())->setTimestamp(intdiv($startMs, 1000))->setTimezone($tz);
        // The frontend treats timestampEnd as exclusive: the range covers the
        // final day minus one.
        $end = (new DateTimeImmutable())
            ->setTimestamp(intdiv($endMs, 1000))
            ->setTimezone($tz)
            ->modify('-1 day');

        $startStr = $start->format('j F Y');
        $endStr = $end->format('j F Y');

        if ($startStr === $endStr) {
            return $endStr;
        }
        if ($start->format('F Y') === $end->format('F Y')) {
            return $start->format('j') . '–' . $endStr;
        }
        if ($start->format('Y') === $end->format('Y')) {
            return $start->format('j F') . '–' . $endStr;
        }
        return $startStr . '–' . $endStr;
    }

    private function timeZone(string $timeZone): DateTimeZone
    {
        try {
            return new DateTimeZone($timeZone ?: 'UTC');
        } catch (Exception) {
            return new DateTimeZone('UTC');
        }
    }
}