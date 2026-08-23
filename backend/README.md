# Ikuyo! Backend — Laravel + Eloquent exploration skeleton

> **What this is:** a runnable Laravel **v13** + Eloquent project, generated on the
> same PHP we target (hosting uses **PHP 8.4**). It exists to let you explore the
> exact Eloquent patterns the migration plan relies on before we build the real API.
> It is a **JSON API only** — the React SPA stays the frontend.

## Requirements (already set up on this machine)

- PHP 8.4 (with `mbstring`, `curl`, `pdo_mysql`, `pdo_sqlite`, `dom`, `zip`, `xml`, `intl`, `gd`)
- Composer 2.10

> Composer was installed to `/usr/local/bin/composer` as `composer.phar`.

## Run it

```bash
cd backend
composer install          # only needed once
php artisan migrate       # creates the sqlite tables
php artisan tinker --execute='(new \Database\Seeders\TripsSeeder)->run()'
php artisan serve --port=8999
```

Then open:

```
GET http://127.0.0.1:8999/api/csrf-token
GET http://127.0.0.1:8999/api/auth/me
GET http://127.0.0.1:8999/api/trips/public
GET http://127.0.0.1:8999/api/metadata/trips/{publicTripId}
GET http://127.0.0.1:8999/up   (health)
```

Most endpoints require a valid session. Log in first via `POST /api/auth/login`
(or use `POST /api/auth/guest`), then authenticate your browser/dev client with the
session cookie before calling `/api/trips` or `/api/trips/{id}`.

The exploration routes `/api/trips/1/sql`, `/api/users/1/trips`, and
`/api/db/example` shown previously are no longer registered; use the routes above.

## What's here — the Eloquent patterns you should learn from

| .                           | File | Pattern |
|-----------------------------|------|---------|
| `trips` + `trip_user` pivot | `database/migrations/2026_01_01_000001_*.php`, `app/Models/Trip.php` | `hasMany`, `belongsToMany(...)->withPivot('role')->withTimestamps()` |
| `activities` (1:N child)    | `2026_01_01_000002_*.php`, `app/Models/Activity.php` | `hasMany` on Trip, `belongsTo` on Activity |
| polymorphic comments         | `2026_01_01_000003_*.php`, `app/Models/Comment.php` | `morphs('commentable')` column, `morphMany`/`morphTo` |
| sample relation queries      | `routes/api.php` | `with()`, `withCount()`, `toSql()`, `DB::table()->join()` |

These map directly onto the Instant graph:

- `trip_user.role` ⇄ Instant `trip$tripUser.role` (owner/editor/viewer)
- `commentable_type/commentable_id` ⇄ Instant `commentGroupObject` polymorphic
- ms-Epoch `BIGINT` timestamps kept as-is (not MySQL `datetime`)

## Deploying on shared hosting

1. Copy `.env.mysql.example` to `.env`, set real database/mail values, and run `php artisan key:generate` once.
2. Upload the repository without `vendor/`; run `composer install --no-dev --optimize-autoloader --prefer-dist` over SSH.
3. Point the hosting document root at `backend/public` (never expose the project root or `.env`).
4. Ensure `storage/` and `bootstrap/cache/` are writable.
5. Run `php artisan migrate --force` and optionally `php artisan optimize`.
6. Confirm `APP_DEBUG=false`, HTTPS, secure cookies, and the `/up` health route.

For the current React app, deploy its static build separately and route `/api/*` to Laravel. Keep the existing SEO front-controller behavior for non-API SPA routes until that code is repointed to MySQL.

### Staging verification checklist

Run these on a staging database, not the local SQLite playground:

```bash
cp .env.mysql.example .env
# Set DB_* and mail values in .env
php artisan key:generate
php artisan migrate:fresh
php artisan instant:import /path/to/instant-backup.zip --dry-run --json
php artisan instant:import /path/to/instant-backup.zip --truncate
php artisan test
php artisan route:list --path=api
```

Verify row counts against Instant `config.json`, then test one public trip, one private
trip, one viewer/editor account, guest upgrade, password reset, CRUD, task movement,
comments, and the SEO metadata endpoint. Do not run `migrate:fresh` against production.

## Layout (Laravel 13)

```
app/
  Http/Controllers/   # controllers go here (routes/api.php uses closures for demo)
  Models/             # Eloquent models
  Providers/          # service providers
bootstrap/app.php     # registers routes (added `api:` here) + middleware
config/               # .env-driven config
database/migrations/  # schema
database/seeders/     # demo data
routes/api.php        # exploration API
```

Laravel is configured as a **pure JSON API**: routes live in `routes/api.php`,
errors on `/api/*` render as JSON (`bootstrap/app.php` → `shouldRenderJsonWhen`).

## Gotchas already baked in (see migration doc §10)

- The API routes are registered via `withRouting(api:)`, so **do not** re-add an
  `/api` prefix inside `routes/api.php` (that caused a double `/api/api/` — fixed
  here).
- `php artisan route:cache` breaks closure-based routes — use controller-action
  routes if you need route caching.
- Keep ms-Epoch timestamps as `BIGINT`, not `datetime` casts.

## Current implementation status

Auth is implemented:

- `POST /api/auth/login` (password)
- `POST /api/auth/logout`
- `POST /api/auth/guest` (guest account)
- `POST /api/auth/upgrade` (guest → email/password)
- `POST /api/auth/forgot` + `POST /api/auth/reset` (password recovery mail)

Sanctum can be added later if a token API client is needed; same-origin session
cookies are used today.

## Notes

- MySQL config — it uses SQLite now so it runs with zero setup. To switch, edit
  `.env` `DB_CONNECTION=mysql` + credentials; the schema is driver-agnostic.
- **Composer is the only dependency step.** The default `package.json`/Vite/Tailwind
  scaffold was removed because this is a JSON-only API with no Blade views to
  compile — `npm install`/`npm run build` are never needed. Visiting `/` returns a
  small JSON hello instead of the Vite-backed welcome page.
- WebSockets/SSE — not needed (no realtime).