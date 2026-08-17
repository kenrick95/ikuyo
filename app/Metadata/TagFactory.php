<?php

declare(strict_types=1);

namespace App\Metadata;

use App\Config\Settings;
use App\Trip\TripMeta;

/**
 * Builds a {@see Tags} value for a given title/description and URL path.
 */
final class TagFactory
{
    private function __construct(private readonly Settings $settings)
    {
    }

    public static function with(Settings $settings): self
    {
        return new self($settings);
    }

    public function forTrip(TripMeta $trip): Tags
    {
        $title = $trip->title !== '' ? $trip->title . ' | Ikuyo!' : 'Ikuyo!';
        $details = (new DateRange())($trip->timestampStart, $trip->timestampEnd, $trip->timeZone);

        $parts = [];
        if ($details !== '') {
            $parts[] = $details;
        }
        if ($trip->activityCount > 0) {
            $noun = $trip->activityCount === 1 ? 'activity' : 'activities';
            $parts[] = "{$trip->activityCount} {$noun}";
        }
        if ($trip->ownerHandle !== null) {
            $parts[] = 'by @' . $trip->ownerHandle;
        }
        $description = implode(' · ', $parts) ?: 'A public trip on Ikuyo!';

        return $this->make(
            title: $title,
            description: $description,
            path: '/trip/' . rawurlencode($trip->id),
        );
    }

    /**
     * @param array{title?: string, description?: string, path?: string, noindex?: bool} $page
     */
    public function forStaticPage(array $page): Tags
    {
        return $this->make(
            title: $page['title'] ?? 'Ikuyo!',
            description: $page['description'] ?? '',
            path: $page['path'] ?? '/',
            robots: !empty($page['noindex']) ? 'noindex, nofollow' : '',
        );
    }

    public function make(string $title, string $description, string $path, string $robots = ''): Tags
    {
        return new Tags(
            title: $title !== '' ? $title : 'Ikuyo!',
            description: $description,
            url: $this->absoluteUrl($path),
            image: $this->siteUrl() . '/ikuyo-og-image.jpg',
            robots: $robots,
        );
    }

    /** Absolute URL from configured SITE_URL, or the request host as fallback. */
    private function absoluteUrl(string $path): string
    {
        return $this->siteUrl() . ($path === '/' ? '/' : '/' . ltrim($path, '/'));
    }

    private function siteUrl(): string
    {
        $site = $this->settings->siteUrl();
        if ($site !== '') {
            return $site;
        }
        $scheme = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    }
}