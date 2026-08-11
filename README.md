# Ikuyo!

Ikuyo! (行くよ！) is an itinerary planning web application.

## Setup

Install the dependencies:

```bash
pnpm install
```

## Get started

Start the dev server:

```bash
pnpm dev
```

Build the app for production:

```bash
pnpm build
```

Preview the production build locally:

```bash
pnpm preview
```

## Deployment (PHP metadata service)

The production host (Apache/LiteSpeed + PHP 8.4) serves a **PHP front
controller** (`index.php`) instead of `index.html` directly. It renders
trip-specific OpenGraph/Twitter preview metadata for shared **public** trips at
`/trip/:id` (and nested sub-routes), and falls back to the generic SPA head for
everything else. Static assets are still served directly by the web server.

### Setup

1. Copy `config.example.php` to `config.php` and fill in:
   - `INSTANT_APP_ID`
   - `INSTANT_ADMIN_TOKEN` (server-side secret, never exposed to clients)
   - `SITE_URL` (e.g. `https://ikuyo.kenrick95.org`)
   - optionally `INDEX_HTML`, `CACHE_DIR`, `INSTANT_API_URI`
2. Deploy `index.php`, `config.php`, and `.htaccess` at the web root, next to
   the built `dist/` contents (so `index.html` sits beside `index.php`).
3. Ensure `.htaccess` rewrites SPA routes to `index.php` (already configured)
   while keeping static files served directly.
4. The `cache/` directory (per-trip metadata cache) and `config.php` are
   gitignored; create them on the server with proper write permissions.

> ⚠️ The InstantDB admin API bypasses permission checks. `index.php` only
> emits trip-specific metadata when the trip's `sharingLevel >= 2` (public), so
> private trip titles/dates are never leaked through the preview path.

