<?php

/**
 * Ikuyo! PHP metadata front controller.
 *
 * Serves trip-specific OpenGraph/Twitter preview metadata for shared public
 * trips (`/trip/<id>` and nested sub-routes), and falls back to serving the
 * built SPA `index.html` (with its generic head) for every other route.
 *
 * Static assets (JS/CSS/images) are served directly by Apache via .htaccess
 * (`RewriteCond %{REQUEST_FILENAME} !-f`), so this script is only reached for
 * non-file, non-dir requests.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_INDEX_HTML = __DIR__ . '/index.html';
const DEFAULT_CACHE_DIR = __DIR__ . '/cache';
const CACHE_TTL_SECONDS = 300; // 5 minutes

/**
 * InstantDB Admin HTTP API. Requires an admin token and bypasses permissions,
 * so callers must verify trip visibility themselves (see query_trip()).
 */
const INSTANT_API_BASE = 'https://api.instantdb.com';
const INSTANT_ADMIN_QUERY_PATH = '/admin/query';

// Public sharing levels >= 2 are link-shareable (PublicUnlisted / PublicListed).
const PUBLIC_SHARING_LEVEL = 2;

function config(string $key, string $default = ''): string
{
    // Prefer real environment variables, then a values.php file (gitignored).
    static $file;
    if ($file === null) {
        $file = [];
        $configPath = __DIR__ . '/config.php';
        if (is_file($configPath)) {
            $file = (array) require $configPath;
        }
    }
    $value = getenv($key) ?: ($file[$key] ?? $default);
    return is_string($value) ? $value : $default;
}

function appId(): string
{
    return config('INSTANT_APP_ID');
}

function adminToken(): string
{
    return config('INSTANT_ADMIN_TOKEN');
}

function apiUri(): string
{
    $uri = config('INSTANT_API_URI', INSTANT_API_BASE);
    return rtrim($uri, '/') . INSTANT_ADMIN_QUERY_PATH;
}

// ---------------------------------------------------------------------------
// Request routing
// ---------------------------------------------------------------------------

/** Serve static files directly when running under `php -S`. */
if (PHP_SAPI === 'cli-server') {
    $urlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
    $file = __DIR__ . $urlPath;
    if ($urlPath !== '/' && is_file($file)) {
        return false; // let the built-in server serve it
    }
}

function requestPath(): string
{
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
    return '/' . ltrim($uri, '/');
}

function tripIdFromPath(string $path): ?string
{
    if (!preg_match('#^/trip/([^/]+)#', $path, $matches)) {
        return null;
    }
    $id = $matches[1];
    // Trip IDs are InstantDB UUIDs; be conservative about what we forward to
    // the admin API and what we embed in the URL.
    return preg_match('/^[a-zA-Z0-9\-]{1,64}$/', $id) ? $id : null;
}

// ---------------------------------------------------------------------------
// InstantDB admin query
// ---------------------------------------------------------------------------

function queryTrip(string $tripId): ?array
{
    $appId = appId();
    $token = adminToken();
    if ($appId === '' || $token === '') {
        error_log('[ikuyo-meta] INSTANT_APP_ID / INSTANT_ADMIN_TOKEN not configured');
        return null;
    }

    $payload = json_encode([
        'query' => [
            'trip' => [
                '$' => (object) ['where' => ['id' => $tripId]],
                'tripUser' => [
                    '$' => (object) ['where' => ['role' => 'owner']],
                    'user' => (object) [],
                ],
                'activity' => (object) [],
            ],
        ],
    ]);

    $url = apiUri();
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
        'App-Id: ' . $appId,
    ];

    $httpCode = 0;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => $headers,
        ]);

        $response = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            error_log('[ikuyo-meta] InstantDB request failed: ' . $error);
            return null;
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $payload,
                'ignore_errors' => true,
                'timeout' => 10,
            ],
        ]);
        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            error_log('[ikuyo-meta] InstantDB request failed via stream context');
            return null;
        }
        if (isset($http_response_header[0]) && preg_match('/HTTP\/\d+\.?\d* (\d+)/', $http_response_header[0], $m)) {
            $httpCode = (int) $m[1];
        }
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        error_log('[ikuyo-meta] InstantDB returned non-JSON response (HTTP ' . $httpCode . ')');
        return null;
    }

    $trips = $data['trip'] ?? [];
    return is_array($trips) && count($trips) > 0 ? $trips[0] : null;
}

/**
 * Fetch a trip's metadata. Returns null when the trip is missing, errored, or
 * not public (sharingLevel < PUBLIC_SHARING_LEVEL). This guard is REQUIRED
 * because the admin API bypasses permission checks.
 */
function fetchPublicTripMeta(string $tripId): ?array
{
    $trip = queryTrip($tripId);
    if ($trip === null) {
        return null;
    }
    $sharingLevel = (int) ($trip['sharingLevel'] ?? 0);
    if ($sharingLevel < PUBLIC_SHARING_LEVEL) {
        return null;
    }

    $ownerHandle = null;
    if (isset($trip['tripUser']) && is_array($trip['tripUser'])) {
        foreach ($trip['tripUser'] as $tu) {
            $user = $tu['user'][0] ?? null;
            if (is_array($user) && !empty($user['handle'])) {
                $ownerHandle = (string) $user['handle'];
                break;
            }
        }
    }

    $activityCount = 0;
    if (isset($trip['activity']) && is_array($trip['activity'])) {
        $activityCount = count($trip['activity']);
    }

    return [
        'id' => (string) $trip['id'],
        'title' => (string) ($trip['title'] ?? ''),
        'timestampStart' => (int) ($trip['timestampStart'] ?? 0),
        'timestampEnd' => (int) ($trip['timestampEnd'] ?? 0),
        'timeZone' => (string) ($trip['timeZone'] ?? 'UTC'),
        'region' => (string) ($trip['region'] ?? ''),
        'ownerHandle' => $ownerHandle,
        'activityCount' => $activityCount,
        'lastUpdatedAt' => (int) ($trip['lastUpdatedAt'] ?? 0),
    ];
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

function cachePath(string $tripId): string
{
    return rtrim(config('CACHE_DIR', DEFAULT_CACHE_DIR), '/') . '/' . $tripId . '.json';
}

function readCachedMeta(string $tripId): ?array
{
    $path = cachePath($tripId);
    if (!is_file($path)) {
        return null;
    }
    if (time() - filemtime($path) > CACHE_TTL_SECONDS) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    return is_array($data) ? $data : null;
}

function writeCachedMeta(string $tripId, array $meta): void
{
    $path = cachePath($tripId);
    $dir = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        return;
    }
    @file_put_contents($path, json_encode($meta, JSON_UNESCAPED_SLASHES), LOCK_EX);
}

function publicTripMeta(string $tripId): ?array
{
    $cached = readCachedMeta($tripId);
    if ($cached !== null) {
        return $cached;
    }
    $meta = fetchPublicTripMeta($tripId);
    if ($meta !== null) {
        writeCachedMeta($tripId, $meta);
    }
    return $meta;
}

// ---------------------------------------------------------------------------
// Metadata + HTML
// ---------------------------------------------------------------------------

/** Format a day range like the app's formatTripDateRange(), e.g. "1–15 Jan 2025". */
function formatDateRange(array $meta): string
{
    if ($meta['timestampStart'] <= 0 || $meta['timestampEnd'] <= 0) {
        return '';
    }
    try {
        $tz = new DateTimeZone($meta['timeZone'] ?: 'UTC');
    } catch (Exception $e) {
        $tz = new DateTimeZone('UTC');
    }

    $start = (new DateTimeImmutable())->setTimestamp(intdiv($meta['timestampStart'], 1000))->setTimezone($tz);
    // The app treats timestampEnd as exclusive (final day - 1).
    $end = (new DateTimeImmutable())->setTimestamp(intdiv($meta['timestampEnd'], 1000))->setTimezone($tz)
        ->modify('-1 day');

    $startStr = $start->format('j M Y');
    $endStr = $end->format('j M Y');
    if ($startStr === $endStr) {
        return $endStr;
    }
    if ($start->format('M Y') === $end->format('M Y')) {
        return $start->format('j') . '–' . $endStr;
    }
    if ($start->format('Y') === $end->format('Y')) {
        return $start->format('j M') . '–' . $endStr;
    }
    return $startStr . '–' . $endStr;
}

function buildMetaTags(array $meta): array
{
    $site = rtrim(config('SITE_URL', ''), '/');
    $url = $site . '/trip/' . rawurlencode($meta['id']);
    $image = $site . '/ikuyo-512.png';

    $title = $meta['title'] !== '' ? $meta['title'] : 'Ikuyo!';
    $parts = [];
    $range = formatDateRange($meta);
    if ($range !== '') {
        $parts[] = $range;
    }
    if ($meta['activityCount'] > 0) {
        $parts[] = $meta['activityCount'] . ' ' . ($meta['activityCount'] === 1 ? 'activity' : 'activities');
    }
    if ($meta['ownerHandle'] !== null) {
        $parts[] = 'by @' . $meta['ownerHandle'];
    }
    $description = implode(' · ', $parts);
    if ($description === '') {
        $description = 'A public trip on Ikuyo!';
    }

    return [
        'title' => $title,
        'description' => $description,
        'url' => $url,
        'image' => $image,
    ];
}

function escapeHtml(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function metaHtml(array $tags): string
{
    $t = escapeHtml($tags['title']);
    $d = escapeHtml($tags['description']);
    $u = escapeHtml($tags['url']);
    $i = escapeHtml($tags['image']);

    return implode("\n    ", [
        '<meta name="description" content="' . $d . '" />',
        '<meta name="twitter:card" content="summary" />',
        '<meta name="twitter:title" content="' . $t . '" />',
        '<meta name="twitter:description" content="' . $d . '" />',
        '<meta name="twitter:image" content="' . $i . '" />',
        '<meta property="og:type" content="website" />',
        '<meta property="og:title" content="' . $t . '" />',
        '<meta property="og:description" content="' . $d . '" />',
        '<meta property="og:url" content="' . $u . '" />',
        '<meta property="og:image" content="' . $i . '" />',
    ]);
}

/** Read the built SPA index.html. */
function loadIndexHtml(): ?string
{
    $path = config('INDEX_HTML', DEFAULT_INDEX_HTML);
    $html = @file_get_contents($path);
    return $html === false ? null : $html;
}

function injectMetaInto(string $html, array $tags): string
{
    $meta = metaHtml($tags);

    // Remove conflicting generic social/description tags so we don't emit both
    // trip-specific and fallback metadata (scrapers take the first occurrence).
    $html = preg_replace(
        '/<meta[^>]*(?:name="(?:description|twitter:(?:title|description|image|card))"|property="og:(?:title|description|url|image|type)")[^>]*>\s*/i',
        '',
        $html,
    );

    // Point canonical at the trip URL.
    $html = preg_replace(
        '/<link rel="canonical"[^>]*>/i',
        '<link rel="canonical" href="' . escapeHtml($tags['url']) . '" />',
        $html,
        1,
    );

    // Inject trip-specific tags right after the title (before canonical).
    $needle = '<link rel="canonical"';
    $pos = strpos($html, $needle);
    if ($pos === false) {
        $pos = strpos($html, '</head>');
        $needle = '</head>';
    }
    return substr_replace($html, $meta . "\n    " . $needle, $pos, strlen($needle));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function run(): void
{
    $path = requestPath();
    $tripId = tripIdFromPath($path);

    $html = loadIndexHtml();
    if ($html === null) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=UTF-8');
        echo 'Missing index.html';
        return;
    }

    if ($tripId !== null) {
        $meta = publicTripMeta($tripId);
        if ($meta !== null) {
            header('Cache-Control: public, max-age=60, s-maxage=' . CACHE_TTL_SECONDS);
            header('Content-Type: text/html; charset=UTF-8');
            echo injectMetaInto($html, buildMetaTags($meta));
            return;
        }
    }

    // Non-trip routes, or private/missing trips: serve the SPA as-is.
    header('Cache-Control: no-cache');
    header('Content-Type: text/html; charset=UTF-8');
    echo $html;
}

if (!defined('IKUYO_SKIP_RUN')) {
    run();
}
