<?php

declare(strict_types=1);

/**
 * Ikuyo! entry point.
 *
 * Serves trip-specific OpenGraph/Twitter preview metadata for shared public
 * trips (`/trip/<id>` and nested sub-routes), page-specific metadata for known
 * SPA routes, and falls back to serving the built `index.html` as-is.
 *
 * Static assets (JS/CSS/images) are served directly by Apache via .htaccess
 * (`RewriteCond %{REQUEST_FILENAME} !-f`), so this script is only reached for
 * non-file, non-dir requests.
 *
 * Metadata source: the Laravel/MySQL backend. Configure LARAVEL_API_URL in
 * config.php; see app/Trip/PublicTrip.php.
 */use App\Routing\FrontController;

// PSR-4 style autoload for the `App\` namespace.
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/app/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

// Serve static files directly under the built-in dev server (`php -S`).
if (PHP_SAPI === 'cli-server') {
    $urlPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';
    if ($urlPath !== '/' && is_file(__DIR__ . $urlPath)) {
        return false; // let the built-in server serve it
    }
}

FrontController::boot()->handle();
