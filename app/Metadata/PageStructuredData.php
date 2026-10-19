<?php

declare(strict_types=1);

namespace App\Metadata;

/** Shared public-page declarations, also consumed by the browser. */
final class PageStructuredData
{
    /** @return list<array<string, mixed>> */
    public static function forPage(string $siteUrl, string $path, string $title, string $description, ?string $tripId = null): array
    {
        $raw = @file_get_contents(dirname(__DIR__, 2) . '/shared/structured-data.json');
        $catalog = $raw === false ? null : json_decode($raw, true);
        if (!is_array($catalog) || !is_array($catalog['entities'] ?? null) || !is_array($catalog['pageTypes'] ?? null)
            || ($tripId === null && !isset($catalog['pageTypes'][$path]))) {
            return [];
        }
        $siteUrl = rtrim($siteUrl, '/');
        $url = $siteUrl . $path;
        $page = [
            '@context' => 'https://schema.org',
            '@type' => $catalog['pageTypes'][$path] ?? 'WebPage',
            '@id' => $url . '#webpage',
            'url' => $url,
            'name' => $title !== '' ? $title : 'Ikuyo!',
            'description' => $description,
            'isPartOf' => ['@id' => $siteUrl . '/#website'],
        ];
        if ($tripId !== null) {
            $page['mainEntity'] = ['@id' => $tripId];
        } elseif ($path === '/' || $path === '/landing') {
            $page['mainEntity'] = ['@id' => $siteUrl . '/#application'];
        }
        $entities = self::absoluteUrls($catalog['entities'], $siteUrl);
        $entities[] = $page;
        return $entities;
    }

    private static function absoluteUrls(mixed $value, string $siteUrl): mixed
    {
        if (is_array($value)) {
            return array_map(static fn (mixed $item): mixed => self::absoluteUrls($item, $siteUrl), $value);
        }
        return is_string($value) && str_starts_with($value, '/') ? $siteUrl . $value : $value;
    }
}
