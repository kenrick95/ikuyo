<?php

declare(strict_types=1);

namespace App\Routing;

/**
 * Request path parsing utilities.
 */
final class Path
{
    /** Normalized request path, always starting with `/`. */
    public static function requestPath(): string
    {
        $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
        return '/' . ltrim($uri, '/');
    }

    /**
     * Extract a valid trip UUID from a `/trip/<id>...` path, or null.
     *
     * Validated as a UUID so that non-trip subroutes like `/trip/public` or
     * `/trip/new` don't trigger a needless admin query.
     */
    public static function tripIdFromPath(string $path): ?string
    {
        if (!preg_match('#^/trip/([^/]+)#', $path, $matches)) {
            return null;
        }
        $id = $matches[1];
        $isUuid = preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $id) === 1;
        return $isUuid ? $id : null;
    }
}