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

    // InstantDB app id (matches INSTANT_APP_ID).
    'INSTANT_APP_ID' => '',

    // InstantDB admin token (matches INSTANT_ADMIN_TOKEN / INSTANT_APP_ADMIN_TOKEN).
    // Keep secret; used to query the admin API.
    'INSTANT_ADMIN_TOKEN' => '',

    // Optional: override the InstantDB API base (e.g. self-hosted). Defaults to
    // https://api.instantdb.com. Do not include a trailing slash or path suffix.
    'INSTANT_API_URI' => '',

    // Post-cutover SEO source: set to 'laravel' and provide LARAVEL_API_URL to read
    // public-trip metadata from the Laravel/MySQL backend instead of InstantDB.
    // Defaults to 'instant' which keeps the InstantDB admin path.
    'METADATA_SOURCE' => 'instant',
    'LARAVEL_API_URL' => '',

    // Absolute public site URL, no trailing slash, used to build og:url / og:image.
    // e.g. 'https://ikuyo.kenrick95.org'
    'SITE_URL' => '',

    // Path to the built SPA index.html. Defaults to <dir>/index.html.
    'INDEX_HTML' => '',
];
