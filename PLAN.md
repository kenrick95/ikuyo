# Plan: PHP Metadata Service for Public Trip Shares

Branch: `feat/public-trip-metadata` (based on `feature/duplicate-trip`)

## Goal

When a public trip is shared (e.g. a chat/OS link preview or social OG scrape of
`/trip/:id`), the recipient should see **trip-specific** preview metadata
(title, date range, owner, activity count, image) instead of the generic
"Ikuyo - Plan your next trip!" fallback.

The hosting currently runs Apache/LiteSpeed with **PHP 8.4** and rewrites all
SPA routes via `.htaccess` to the built `index.html`. We will change that to a
**PHP front controller** that renders metadata based on the requested route.

## Background / current state

- SPA built by rsbuild into `dist/`; routing via `wouter`.
- Route surface relevant here:
  - `/trip/:id` and nested `/trip/:id/list`, `/timetable`, `/map`,
    `/expenses`, `/comment`, `/tasks`, and `/activity/:id`, etc.
- `.htaccess` (repo root) currently rewrites any non-file/non-dir request to
  `index.html`:
  ```
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```
- Data model: `trip` entity has `title`, `timestampStart`, `timestampEnd`,
  `timeZone`, `region`, `sharingLevel`, plus `publicShowExpenses`/
  `publicShowTasks`/`publicShowComments` toggles. Owner handle is reached via
  `trip -> tripUser (role='owner') -> user.handle`.

### Sharing levels

`src/Trip/tripSharingLevel.ts`:
- `Private = 0`
- `PublicUnlisted = 2`
- `PublicListed = 3`

Both `PublicUnlisted` and `PublicListed` are **viewable / link-shareable**
(perms: `view: isTripPublic` where `isTripPublic` is `sharingLevel >= 2`). The
public directory listing (`/trip/public`) only shows `PublicListed`, but any
`>= 2` trip can be shared by URL. The metadata service must treat `>= 2` as
"public".

## Data source: InstantDB Admin HTTP API

From InstantDB docs (`llms-full.txt`), server-side (non-JS) reads use the admin
HTTP API. It is an **admin** endpoint: it **requires** an admin token and
**bypasses all permission checks**.

- **Endpoint:** `POST https://api.instantdb.com/admin/query`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <ADMIN_TOKEN>`
  - `App-Id: <APP_ID>`
- **Body (InstaQL):**
  ```json
  {
    "query": {
      "trip": {
        "$": { "where": { "id": "<trip-id>" } },
        "tripUser": {
          "$": { "where": { "role": "owner" } },
          "user": {}
        },
        "activity": {}
      }
    }
  }
  ```
- Response shape: `{ "trip": [ { "id": ..., "title": ..., ... } ] }`
- Base domain default: `https://api.instantdb.com` (override via `apiURI` if
  self-hosted).

> ⚠️ **Security**: Because the admin API bypasses permissions, the PHP service
> **must itself** confirm the returned trip is public (`sharingLevel >= 2`)
> before emitting any trip-specific metadata. Otherwise private trip titles and
> dates would leak through the scraper path. For non-public or missing trips,
> fall back to the generic head.

## Design

A single `index.php` front controller deployed at hosting root (beside the
built `index.html` / static assets).

### Request flow

1. **Static files** (`/assets/*.js`, `*.css`, images, icons, `sw.js`, etc.)
   continue to be served directly by Apache — never touch PHP. Kept by the
   existing `RewriteCond %{REQUEST_FILENAME} !-f` (and `!-d`) guards in
   `.htaccess`.
2. **`/trip/<id>`** (with or without a nested sub-path): PHP queries InstantDB
   for the trip.
   - Trip found **and** `sharingLevel >= 2` → inject OpenGraph/Twitter metadata
     into the `<head>` of the built `index.html` and serve it (correct SPA
     still boots; URL is unchanged).
   - Trip missing or private → serve built `index.html` with the **generic**
     head (no trip-specific data emitted).
3. **Any other route** (`/trip`, `/trip/public`, `/login`, `/landing`, `/`,
   etc.) → serve built `index.html` unchanged (generic head).

### Metadata to render (mirrors `TripPublicCard` / `TripsPublic/store.ts`)

- `og:title` / `twitter:title`: `<trip.title>`
- `og:description` / `twitter:description`: `"<date range> · N activities · by @ownerHandle"` (or omit pieces that are absent)
  - Date range: derived from `timestampStart`/`timestampEnd` in `timeZone`
    (same day-count logic as `src/Trip/time.ts` `formatTripDateRange`).
  - Activity count: `activity` link length.
- `og:url` / `twitter:card`: canonical `https://<host>/trip/<id>`, card `summary`.
- `og:image` / `twitter:image`: `https://<host>/ikuyo-512.png` (or `ikuyo-192.png`).
- `og:type`: `website` (or `article` if a theme exists). Keep simple: `website`.
- Preserve the existing generic base tags (`og:title` "Ikuyo", description
  "Plan your next trip!", canonical, theme-color) as fallback for non-trip and
  private-trip routes.

## Implementation steps

1. **`index.php`** — front controller:
   - Parse the request path; detect `/trip/<id>`.
   - Read the built `index.html` from a configurable path (deployment root).
   - If a trip route: call InstantDB admin query via cURL; validate `sharingLevel >= 2`.
   - Inject `<meta>` tags into `<head>` (string replace on a sentinel, e.g.
     before `</head>`), escape all dynamic values.
   - Fall back to serving `index.html` as-is otherwise.
   - Set `Cache-Control: no-store` for the trip metadata pages so a trip that
     becomes private is never served stale by a shared cache/CDN.
2. **`.htaccess`** — route SPA requests through `index.php` instead of
   `index.html` while preserving static-file serving:
   ```
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule . /index.php [L]
   ```
   Keep the existing `index.html` ETag/no-cache handling (or move to `index.php`).
3. **`config.example.php`** + gitignored **`config.php`**:
   - `INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`, optional `INSTANT_API_URI`.
   - Root HTML path constant.
   - Provide `getenv()`/dotenv-style overrides so secrets stay out of git.
4. **`.gitignore`**: add `config.php`.
5. **Docs**: update README / deploy notes with placement of `index.php`,
   `config.php`, and the `.htaccess` change.

> Note: an initial per-trip file cache was considered and removed during review.
> Because the admin API bypasses permissions, caching trip metadata risks serving
> stale (now-private) trip data. Each preview re-fetches the trip and validates
> `sharingLevel >= 2`, and responses are `Cache-Control: no-store`.

## Verification

- `php -S localhost:8080` (with built `dist` copied to a served dir + `config.php`).
- A **public** trip `/trip/<id>` returns `og:title` = trip title and correct
  description; page still boots the SPA.
- A **private** trip id returns the **generic** head (no trip data).
- A missing id and non-trip routes (`/`, `/trip`, `/login`) return generic head.
- Static assets (JS/CSS/images) still load.

## Out of scope

- Dynamic OG images (generating a thumbnail server-side) — not required now.
- Metadata for non-trip pages beyond the existing generic head.
