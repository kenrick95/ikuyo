<?php

declare(strict_types=1);

/**
 * Assert that `shared/pages.json` (the source of truth, shared with the
 * frontend) matches the built-in catalog in `App\Pages\StaticPages::fallback()`.
 *
 * The fallback is only used when the JSON file is absent, so this check keeps
 * the two from silently drifting. Run: `php scripts/check-static-pages.php`
 */

use App\Pages\StaticPages;

// PSR-4 style autoload for the `App\` namespace (mirrors index.php).
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }
    $relative = substr($class, strlen($prefix));
    $path = __DIR__ . '/../app/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($path)) {
        require $path;
    }
});

$filePath = __DIR__ . '/../shared/pages.json';
$raw = @file_get_contents($filePath);
if ($raw === false) {
    fwrite(STDERR, "Error: cannot read {$filePath}" . PHP_EOL);
    exit(1);
}
$decoded = json_decode($raw, true);
if (!is_array($decoded)) {
    fwrite(STDERR, "Error: invalid JSON in {$filePath}" . PHP_EOL);
    exit(1);
}

// Normalize the file the same way StaticPages::all() normalizes entries.
$file = [];
foreach ($decoded as $path => $meta) {
    if (!is_array($meta)) {
        continue;
    }
    $file[(string) $path] = [
        'title' => (string) ($meta['title'] ?? ''),
        'description' => (string) ($meta['description'] ?? ''),
        'noindex' => (bool) ($meta['noindex'] ?? false),
    ];
}

if ($file == (new StaticPages())->fallback()) {
    echo 'Static pages catalog is consistent with fallback.' . PHP_EOL;
    exit(0);
}

fwrite(STDERR, 'Error: shared/pages.json differs from StaticPages::fallback()' . PHP_EOL);
exit(1);