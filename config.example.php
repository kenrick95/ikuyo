<?php

/**
 * Ikuyo! PHP metadata service configuration.
 *
 * Copy this file to `config.php` and fill in your real values. `config.php`
 * is gitignored and must never be committed.
 *
 * These values can also be supplied via real environment variables (they take
 * precedence over this file).
 */

return [
    // Application environment: 'development'/'local' enables verbose request
    // handling logs (trip resolution, matched route, fallback). Omitted on prod.
    'APP_ENV' => '',

    // Laravel JSON API used for public-trip metadata.
    'LARAVEL_API_URL' => 'http://localhost:8999',

    // Absolute public site URL, no trailing slash, used to build og:url / og:image.
    // e.g. 'https://ikuyo.kenrick95.org'
    'SITE_URL' => 'http://localhost:5173',

    // Path to the built SPA index.html. Defaults to <dir>/index.html.
    'INDEX_HTML' => 'index.html',
];
