# Backend Migration Implementation Status

Updated: 2026-08-22

This document is the current source of truth for what has been implemented in the
Laravel/MySQL migration and what still needs to be completed. **InstantDB remains
installed and is not being removed yet.** The migration flags are intentionally
opt-in so each area can be tested independently.

## Current branches and locations

- Branch: `feat/backend-migration`
- Laravel application: `backend/`
- Existing React application: repository root / `src/`
- Strategy: `docs/migration/php-mysql-migration.md`
- Endpoint inventory: `docs/migration/api-endpoints.md`
- Implementation design: `docs/migration/backend-implementation.md`

## Implemented

### Local/runtime setup

- PHP 8.4 development runtime verified.
- Composer installed and Laravel 13 project generated.
- Laravel skeleton runs with SQLite locally and has MySQL configuration examples.
- Vite/npm frontend files removed from the backend because Laravel is being used as a
  JSON API only.
- Shared-host deployment notes are in `backend/README.md` and
  `backend/.env.mysql.example`.

### Database and Eloquent

- Laravel migrations exist for users, trips, memberships, activities,
  accommodations, macroplans, expenses, task lists, tasks, comment groups,
  comment-group objects, comments, cache, jobs, and sessions.
- Instant-style string IDs are preserved as `VARCHAR(40)`.
- Instant millisecond timestamps are represented as `BIGINT` columns.
- Eloquent models and relationships exist for the main entities.
- A `HasMsTimestamps` model concern sets `created_at_ms` and `updated_at_ms`.
- Trip/user pivot roles are represented numerically: owner `0`, editor `1`, viewer `2`.
- Import regression tests cover preserved IDs and links.

### Authentication

Laravel endpoints exist for:

- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/guest`
- `POST /api/auth/upgrade`
- `POST /api/auth/forgot`
- `POST /api/auth/reset`

Implemented behavior:

- Session-cookie authentication.
- Guest account creation.
- Guest → email/password upgrade.
- Password hashing.
- Password reset tokens with expiry.
- Generic forgot-password response to avoid user enumeration.
- Opt-in React login/guest UI.
- Opt-in React password recovery UI.
- Opt-in React guest upgrade UI.

Flag:

```env
IKUYO_BACKEND_AUTH=false
```

Full-trip reads are controlled independently by `IKUYO_BACKEND_TRIP_READS`; it defaults
false and falls back to InstantDB subscriptions. This makes read cutover reversible.

### Authorization

- `TripAccessService` evaluates public/member/editor/owner access.
- `AuthorizeTripAccess` middleware is registered as `trip.access`.
- Private-trip access and viewer write-denial tests exist.
- Section visibility is applied to the full-trip serializer for expenses, tasks, and comments.

### Read API

Implemented:

- `GET /api/trips` — authenticated user's trips, active/past filtering and cursor pagination.
- `GET /api/trips/public` — public listed trips with owner handle and activity count.
- `GET /api/trips/{trip}` — full trip graph.
- `GET /api/trips/{trip}/{entity}` — child collection reads.
- `GET /api/users/me`.
- `GET /api/users/by-handle/{handle}`.
- `GET /api/sync` — incremental change polling by timestamp and trip scope.
- `GET /api/csrf-token`.

React read adapters exist for:

- Public trips.
- User trips.
- Full trip detail.
- API error handling and cursor pages.
- Periodic sync hook with focus/visibility refresh.

### Trip writes

Backend and opt-in frontend support exist for:

- Create trip + owner membership atomically.
- Update trip.
- Delete trip.
- Duplicate trip.
- Change sharing level.
- Change public/viewer section visibility.
- Add/update/remove trip members.

Flag:

```env
IKUYO_BACKEND_TRIP_WRITES=false
IKUYO_BACKEND_SHARING_WRITES=false
IKUYO_BACKEND_TRIP_READS=false
```

### Content writes

Backend and opt-in frontend support exist for:

- Activities: create, update, delete, drag/resize, duplicate, batch timestamp update.
- Accommodations: create, update, delete.
- Macroplans: create, update, delete.
- Expenses: create, update, delete.
- Comments: create group/first comment, add comment, status, edit, delete.

Flags:

```env
IKUYO_BACKEND_ACTIVITY_WRITES=false
IKUYO_BACKEND_CONTENT_WRITES=false
```

### Tasks

Backend and opt-in frontend support exist for:

- Task-list CRUD.
- Task CRUD.
- Task reorder.
- Task-list reorder.
- Move task between lists.

Flag:

```env
IKUYO_BACKEND_TASK_WRITES=false
```

### Import

`backend/app/Console/Commands/ImportInstantBackup.php` exists and supports:

```bash
php artisan instant:import /path/to/backup.zip --dry-run
php artisan instant:import /path/to/extracted-backup --truncate
```

It currently supports:

- ZIP or extracted backup directory.
- `entities/*.jsonl` parsing.
- Dry-run counts.
- Parent-first import order.
- Preserved entity IDs.
- Basic link-to-FK conversion.
- Role and object-type conversion.
- Timestamp conversion.
- Import fixture regression test.

## Remaining work / external validation

Core application implementation is complete in the Laravel skeleton. The items below
are remaining validation, deployment, and cutover work; they require access to the
actual InstantDB backup and hosting environment.


### ✅ 1. Durable sync events and delete tombstones (implemented)

A durable `sync_events` table, `SyncEventService`, model observer, and event-ID cursor
are implemented. Updates and deletes have a durable event path; the frontend hook uses
the event cursor. Delete-tombstone regression coverage passes. Staging should still
exercise long-running sync behavior.

### ✅ 2. Full API response contract (implemented; staging validation remains)

The full-trip response is normalized through `src/data/apiTrip.ts`; backend serializer
coverage and a full-trip contract test now exist. A real staging run should still compare
every field against production.

- Normalize all nested entities from snake_case to the exact frontend camelCase shape.
- Normalize `taskLists/tasks` to `taskList/task` where required.
- Normalize `commentGroups/comments/objects` to the existing comment-store shape.
- Apply section visibility to every endpoint, not only full-trip serialization.
- Avoid exposing member email addresses to unauthorized viewers.
- Add complete contract fixtures for every entity.

### ✅ 3. Authorization implementation (implemented; expand staging matrix)

Authorization middleware and route checks are present, with core tests. The staging
matrix should still exercise every role/resource combination:

- Public anonymous reads.
- Viewer reads and hidden sections.
- Viewer/editor/owner mutations.
- Cross-trip entity IDs.
- Member management edge cases.
- Comment edit/delete ownership.
- Guest account ownership.

### ✅ 4. Import validation tooling (real-backup run completed; MySQL validation remains)

The importer supports `--dry-run --json --verify-config`, synthetic complete-graph
regression tests, parent-side link reconstruction, orphan reporting, and post-import
counts. The supplied production backup has now imported successfully locally; 7
known orphan records were reported. Before go-live it must still be run on staging MySQL.

- `$users.jsonl` identity links.
- `$files.jsonl` decision and any actual file blobs.
- All link representations used by the real backup.
- Optional/null fields.
- Existing duplicate handles/emails.
- Date-string and numeric timestamp variants.
- Polymorphic `commentGroupObject` links.
- Real entity counts from `config.json` (the command now fails on mismatches).
- Re-running imports safely and idempotently.
- A staging MySQL import, not only SQLite.

### 5. Import-to-production cutover tooling

Still needed:

- A documented staging import procedure.
- A final-backup command/checklist.
- Import validation report with counts and checksums.
- A way to prevent writes during final import.
- A clear rollback procedure before enabling Laravel writes.

### ✅ 6. Frontend migration adapters (implemented; enable/test flags)

#### Read-only & maintenance mode (implemented)

The frontend can be put into a freeze/migration state without touching the Laravel
flags:

- `IKUYO_MAINTENANCE_MODE=true` — replaces the whole app with a maintenance page
  (`src/Maintenance/PageMaintenance.tsx`); router and auth UI are bypassed.
- `IKUYO_READ_ONLY_MODE=true` — keeps the SPA usable for browsing but rejects every
  write at the data layer via `assertWritable()` (in `src/data/backendConfig.ts`),
  enforced in the API mutation helpers (`src/data/apiClient.ts`) and by replacing
  the native `db.transact` (`src/data/db.ts`). A slim `ReadOnlyBanner` is shown.

`IKUYO_READ_ONLY_MODE` also bars the auth write paths that create or modify user
rows — guest creation, email-linking/upgrade, password reset, and native
magic-code sign-in — while leaving **login** (and sign-out) available so existing
users can still read their trips. Guards live in `src/Auth/BackendLogin.tsx`,
`src/Auth/Auth.tsx`, `src/Account/BackendAccountUpgrade.tsx`, and
`src/Account/PageAccountUpgrade.tsx`.

Use the read-only flag during the “freeze Instant writes + take the final backup”
window, then the maintenance flag for the full cutover. Both are independent of (and
can be combined with) the opt-in `IKUYO_BACKEND_*` flags.

Some frontend modules still directly call InstantDB in fallback branches. InstantDB
must remain for now, but before final cutover every operation must have a verified
Laravel equivalent and be intentionally switched:

- Auth store default path and account-linking logic.
- Remaining InstantDB query helpers in domain modules.
- Any undo path that still writes to InstantDB.
- Frontend trip-store live subscription replacement.
- Full-trip periodic sync consumer/refresh behavior.
- Error/loading behavior after switching from subscriptions to fetches.

### ✅ 7. Realtime replacement decision

Realtime is intentionally not required. The current target is:

- Optimistic local update for the current user's own write.
- Refetch after mutation.
- Refetch on navigation and browser focus.
- Optional `GET /api/sync` polling every 30–60 seconds.

The durable sync endpoint and frontend polling hook exist. The hook triggers refresh
callbacks; the full trip store still needs the final UI-level merge/refetch wiring in
staging.

### 8. SEO front controller repoint

The existing PHP SEO front controller still reads InstantDB's admin API. It must be
changed to read MySQL/Laravel data before InstantDB is shut down.

### 9. Production deployment verification

Still needed on the real shared host:

- PHP extension verification.
- Composer deployment.
- Laravel `public/` document-root setup.
- `/api/*` routing alongside the existing SPA/SEO front controller.
- Writable `storage/` and `bootstrap/cache/`.
- MySQL migrations.
- SMTP delivery for reset emails.
- HTTPS secure sessions.
- Production `APP_DEBUG=false`.

### 10. Remaining production security review

Core password-reset mail delivery, rate limiting, CSRF handling, and authorization
coverage are implemented. Before enabling production, perform this final review:

- Replace broad `$guarded = []` on models with explicit `$fillable` or DTOs.
- Validate request bodies with dedicated Form Requests rather than broad
  `$request->except()`.
- Confirm logs contain no reset tokens or sensitive user data.
- Confirm session cookies and HTTPS behavior on the real host.
- Run the authorization matrix against staging data.

### 11. Frontend build/runtime configuration

The migration flags are injected by `rsbuild.config.ts`, but production builds still
require the existing app environment variables (Instant app ID, MapTiler, etc.). A
staged backend deployment needs a complete environment example and a build test with:

```env
IKUYO_API_URL=
IKUYO_BACKEND_AUTH=true
IKUYO_BACKEND_TRIP_WRITES=true
IKUYO_BACKEND_ACTIVITY_WRITES=true
IKUYO_BACKEND_CONTENT_WRITES=true
IKUYO_BACKEND_TASK_WRITES=true
IKUYO_BACKEND_SHARING_WRITES=true
IKUYO_BACKEND_TRIP_READS=true
```

`IKUYO_BACKEND_TRIP_READS` is now wired. When false, full-trip detail uses the existing
InstantDB subscription path; when true, it uses the Laravel HTTP API.

## Recommended implementation order from here

1. Add a real API contract/serializer layer and complete full-trip response tests.
2. Finish authorization tests for every resource.
3. Run the now-tested importer against staging MySQL.
4. Complete frontend auth/store periodic refresh behavior.
5. Repoint SEO metadata to Laravel/MySQL.
6. Deploy Laravel + MySQL to shared-host staging.
7. Enable backend flags in staging and run end-to-end tests.
8. Freeze InstantDB writes, take final export, import MySQL, and switch production.
9. Keep InstantDB code/dependencies until post-cutover verification is complete.
10. Remove InstantDB only after the migration has been stable and rollback is no longer needed.

## Definition of ready for data migration

Do not attempt the production migration until all of these are true:

- A real Instant backup imports into staging MySQL without manual row edits.
- Entity counts and selected checksums match.
- Existing email users can log in or recover their password.
- Guest users retain their trips and can upgrade.
- Public/private/viewer/editor/owner behavior matches Instant permissions.
- Full trip detail renders from Laravel.
- Every create/update/delete operation works from the React UI in staging.
- Task reorder/move and comment operations work.
- Public SEO metadata reads MySQL.
- Shared-host deployment works with production-like HTTPS and SMTP.
- InstantDB is still available as rollback until the final verification period ends.

---

# ▶ NEXT STEPS — EXACT RUNBOOK

This is the precise order to follow to get from "backend implemented" to "production
migration done". Each step states the folder, the environment, the exact command, and
what it achieves. **Work top to bottom.** Do not remove InstantDB until step 9.

---

## Step 0 — Records live status and branch

Work from: **local**, on branch `feat/backend-migration`.

```bash
cd /home/dietpi/dev/ikuyo
git fetch origin
git checkout feat/backend-migration
git pull
git status --short   # expect: clean, on feat/backend-migration
```

The two runnable codebases are **separate folders**:

| folder | what it is | environment it runs on |
|---|---|---|
| `/home/dietpi/dev/ikuyo` (repo root) | React SPA + existing PHP SEO front-controller (`index.php`, `app/`, `config.example.php`) | shared web host (LiteSpeed/Apache) |
| `/home/dietpi/dev/ikuyo/backend` | Laravel 13 JSON API + MySQL schema + importer | shared host (PHP 8.4 + MySQL) OR local SQLite for dev |

---

## Step 1 — CONFIRM the local dev backend runs (local, SQLite)

**Folder:** `backend/` — **environment:** local dev machine.

```bash
cd backend
cp .env.example .env          # dev defaults: sqlite + log mail
composer install
php artisan key:generate
php artisan migrate:fresh --seed
php artisan test              # expect: 16 tests / 57 assertions passed
```

Serves:

```bash
php artisan serve --port=8999
```

Then open:

```bash
# health (no auth)
http://127.0.0.1:8999/up
# start a session + CSRF token, then use it for every authed call
http://127.0.0.1:8999/api/csrf-token
# public / metadata / health
http://127.0.0.1:8999/api/trips/public
http://127.0.0.1:8999/api/metadata/trips/{publicTripId}
```

**What it proves:** the whole Laravel app boots, migrations run, and API routes respond
locally. If `php artisan test` fails, stop and fix before proceeding.

---

## Step 2 — RUN THE IMPORTER AGAINST THE REAL BACKUP (local, SQLite)

**Folder:** `backend/` **Environment:** local dev machine (SQLite is fine for a dry
run + validation; final import must be MySQL).

Put your Instant export on the machine, e.g. `D:\Dev\ikuyo\instant-backup-*.zip`.

```bash
cd backend
# Dry-run + verify counts against config.json WITHOUT writing:
php artisan instant:import D:/Dev/ikuyo/instant-backup-*.zip --dry-run --verify-config --json
```

Expect the output we saw: every entity `expected == actual == ok`. Then do a real
import into the local SQLite dev DB:

```bash
php artisan instant:import D:/Dev/ikuyo/instant-backup-*.zip --truncate
```

After `Import complete`, the command prints a **post-import verification table**
(`config` vs `imported` vs `diff`). Expect the diff to be only genuine orphans
(orphaned tripUser / task / comment), with **all 265 comments imported** with authors.

```bash
# Confirm counts query (local SQLite):
php artisan tinker
# inside tinker:
DB::table('users')->count();   # etc.
```

**What it proves:** your actual production data imports correctly into the schema,
all FKs resolve, and the only skips are genuine orphaned rows. This is the single
most important validation gate before cutover.

---

## Step 3 — SWITCH THE BACKEND TO MYSQL (staging / shared host)

**Folder:** `backend/` **Environment:** shared host where the real MySQL DB lives.

Laravel dev uses SQLite for convenience. Point the same code at MySQL with a real
`.env`:

1. Copy the MySQL template:
   ```bash
   cp .env.mysql.example .env
   ```
2. Edit `.env` and fill real values:
   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   DB_CONNECTION=mysql
   DB_HOST=<mysql host, usually 127.0.0.1>
   DB_PORT=3306
   DB_DATABASE=ikuyo        # create this DB in your host's MySQL panel first
   DB_USERNAME=<mysql user>
   DB_PASSWORD=<mysql pass>
   MAIL_MAILER=smtp         # for password-reset emails
   MAIL_HOST=<smtp host>
   MAIL_PORT=587
   MAIL_USERNAME=<smtp user>
   MAIL_PASSWORD=<smtp pass>
   MAIL_FROM_ADDRESS=noreply@yourdomain.com
   ```
3. Generate the app key (once) and run migrations + import on MySQL:
   ```bash
   git pull
   composer install --no-dev --optimize-autoloader --prefer-dist
   php artisan key:generate
   php artisan migrate:fresh          # WARNING: only on a fresh/empty DB
   php artisan instant:import /path/to/instant-backup-*.zip --truncate
   php artisan test
   ```

**What it does:** validates the identical code + schema against **real MySQL** and
imports the real data into it. If PHPUnit passes under MySQL too, production DB
compat is proven.

---

## Step 4 — SHARED-HOST PHP SETUP (deploy the Laravel app)

**Folder:** `backend/` **Environment:** shared hosting webroot (the host must give
you SSH + Composer; you already have this).

Requirements to confirm on the host:

```bash
php -v                 # should be PHP 8.4
composer --version     # Composer installed
php -m | grep mysqli   # pdo_mysql present
```

Deployment layout on the host:

```text
public_html/
├── index.php, index.html, app/, public/, config.php   ← existing SPA + SEO front controller
└── backend/                                            ← Laravel
    ├── public/index.php   (document root for /api/*)
    ├── .env
    └── ...
```

Document root behavior you must keep working:

- **SPA + SEO:** host `index.php` / `index.html` (repo root). It serves the React app
  and trip preview OG meta.
- **API:** the host must route `/api/*` to `backend/public/index.php`.
- LitedSpeed/Apache `RewriteRule` for `/api/*` → Laravel, everything else → SPA front
  controller. (Put the `/api` block **above** the generic SPA rewrite rule.)

Set writables:

```bash
php artisan optimize
# ensure backend/storage and backend/bootstrap/cache are writable
```

---

## Step 5 — REPOINT SEO METADATA FROM INSTANTDB TO MYSQL/LARAVEL

**Folder:** repo root (`index.php`, `app/`) **Environment:** shared host.

Today the root `index.php` queries **InstantDB's admin HTTP API** for public-trip
metadata (see `index.php` → `queryTrip()`). Before InstantDB turns off, point this at
MySQL instead.

There is already a Laravel endpoint:

```bash
GET /api/metadata/trips/{tripId}
```

Returns public-trip metadata and returns `404` for private trips (no leak). Two options:

**Option A (recommended):** change `queryTrip()` in the root `index.php` to call the
Laravel metadata endpoint via cURL instead of the InstantDB admin API. The shape is
almost identical.

**Option B:** until you script a rewrite, keep the SEO controller reading a cached
copy of public-trip metadata from MySQL via a tiny PDO query. This avoids depending on
the Laravel HTTP path during the transition.

**Never do:** let the SEO controller serve private-trip titles/dates. The Laravel
endpoint already enforces `sharing_level >= 2`.

---

## Step 6 — BUILD THE REACT FRONTEND WITH THE BACKEND FLAGS **ON**

**Folder:** repo root **Environment:** local / staging.

Each `IKUYO_BACKEND_*` flag switches one slice from InstantDB to Laravel. Build the
frontend once with flags on, then run the SPA against Laravel in the same process as
Backend step.

```dotenv
# .env (repo root)
IKUYO_API_URL=            # e.g. https://yourhost.com  (or blank = same origin)
IKUYO_BACKEND_TRIP_READS=true
IKUYO_BACKEND_AUTH=true
IKUYO_BACKEND_TRIP_WRITES=true
IKUYO_BACKEND_ACTIVITY_WRITES=true
IKUYO_BACKEND_CONTENT_WRITES=true
IKUYO_BACKEND_TASK_WRITES=true
IKUYO_BACKEND_SHARING_WRITES=true
```

```bash
cd /home/dietpi/dev/ikuyo
pnpm exec tsc --noEmit              # typecheck
pnpm build                          # build the SPA (needs INSTANT_APP_ID etc.)
```

Then serve the React SPA with Laravel in backend mode:

```bash
# Start Laravel
cd backend && php artisan serve --port=8999 &

# Serve the built SPA output (dist) pointed at *:8999/api for the API
```

**What it does:** exercises **every** read + write path through Laravel with InstantDB
OFF, proving the frontend+backend integration end-to-end. This is the pre-cutover test.

---

## Step 7 — FULL E2E FUNCTIONAL TEST MATRIX (manual script)

With flags on and both processes running, walk through every item:

| area | what to do | what proves it |
|---|---|---|
| Auth | log in with email/password, create guest, upgrade guest | session persists; upgrade works |
| Password recovery | hit forgot → reset email → reset link | valid reset; no enumeration (`ok:true` for unknown too) |
| Trips | create, edit, share (owner/viewer/editor), delete | only owner can delete |
| Public share | share a public trip, view anonymous | OG/social preview reads MySQL |
| Activities | create, edit, drag/resize, duplicate, swap days | batch endpoint; drag-end works |
| Accommodations/Macro/Expenses | CRUD | persisted, no orphan |
| Tasks | list CRUD, reorder, move | reorder path works |
| Comments | add, edit, delete, resolve | delete cleans group/object |
| Sync | second tab edits a trip | first tab picks it up in ~30s |

For every row STOP if it fails and fix that route before proceeding.

---

## Step 8 — PRODUCTION CONTROL / FREEZE WINDOW (final backup)

**Folder:** repo root **Environment:** production documented.

The frontend already has a maintenance/read-only gate (see `IKUYO_MAINTENANCE_MODE`,
`IKUYO_READ_ONLY_MODE`). Before cutover:

```dotenv
IKUYO_READ_ONLY_MODE=true    # app readable; all writes rejected
```

Then take the **final** InstantDB backup:

```bash
npx instant-cli@latest backup download --latest
```

Import that **final** zip into the MySQL staging/production DB (Step 3). After this,
no more InstantDB writes occur.

---

## Step 9 — CUTOVER & VERIFY (KEEPING InstantDB as rollback)

Switch production to Laravel (the React app already reads Laravel when the flags are
on; the shared hosting routes `/api/*` to Laravel). Run through the Step 7 matrix once
more on production HTTPS/SMTP.

**Do NOT delete InstantDB code/deps yet.** Keep `@instantdb/*`, `instant.schema.ts`,
`instant.perms.ts`, and the Instant env vars so you can roll back for at least a week
of stable operation.

---

## Step 10 — DECOMMISSION InstantDB (only after stable)

Only when Step 9 has run stable (no rollback in N days):

- Remove `@instantdb/*` from `package.json` (`pnpm install`)
- Remove the `INSTANT_APP_*` / `INSTANT_*` env vars
- Archive `instant.schema.ts` / `instant.perms.ts` as docs
- Stop the Instant app

---

# ENV VAR REFERENCE

## Repo root `.env` (React SPA + build; built-time)

| var | default | meaning |
|---|---|---|
| `INSTANT_APP_ID` | required | InstantID app id (still present until step 10) |
| `INSTANT_API_URI` | blank → default | InstantID API base |
| `INSTANT_WEBSOCKET_URI` | blank → default | InstantID realtime socket |
| `MAPTILER_API_KEY` | required | map tile key |
| `MAPTILER_MAP_STYLE_LIGHT` / `_DARK` | preset map styles | dark/light style |
| `SENTRY_ENABLED` | true | sentry on/off |
| `SENTRY_DSN` | required in prod | sentry DSN |
| `SENTRY_RELEASE` | blank | sentry release id |
| `NODE_ENV` | development | `production`/`development` |
| `IKUYO_API_URL` | blank = same-origin | Laravel API base |
| `IKUYO_BACKEND_TRIP_READS` | false | read trip detail via Laravel (else InstantID) |
| `IKUYO_BACKEND_AUTH` | false | use Laravel auth pages (else InstantID) |
| `IKUYO_BACKEND_TRIP_WRITES` | false | write trips (create/update/delete/duplicate) via Laravel |
| `IKUYO_BACKEND_ACTIVITY_WRITES` | false | write activities via Laravel |
| `IKUYO_BACKEND_CONTENT_WRITES` | false | write accommodations/macros/expenses/comments via Laravel |
| `IKUYO_BACKEND_TASK_WRITES` | false | write tasks/task-lists via Laravel |
| `IKUYO_BACKEND_SHARING_WRITES` | false | write sharing/members via Laravel |
| `IKUYO_MAINTENANCE_MODE` | false | whole app replaced with maintenance page |
| `IKUYO_READ_ONLY_MODE` | false | block writes but let reads work (freeze) |

## `backend/.env` (Laravel; from `.env.example` or `.env.mysql.example`)

Core:

| var | example | meaning |
|---|---|---|
| `APP_ENV` | `local` / `production` | env name |
| `APP_DEBUG` | `true` local, `false` prod | debug output |
| `APP_URL` | `http://localhost:8000` / real | base URL |

Database (SQLite vs MySQL is the `DB_CONNECTION` switch):

| var | example | meaning |
|---|---|---|
| `DB_CONNECTION` | `sqlite` (dev) / `mysql` (prod) | driver |
| `DB_HOST` | `127.0.0.1` | host |
| `DB_PORT` | `3306` | port |
| `DB_DATABASE` | `laravel` / `ikuyo` | DB name |
| `DB_USERNAME` / `DB_PASSWORD` | mysql user/pass | credentials |

Session / mail:

| var | example | meaning |
|---|---|---|
| `SESSION_DRIVER` | `database` | session store |
| `SESSION_LIFETIME` | `43200` (12h) | minutes |
| `SESSION_SECURE_COOKIE` | `true` prod | https-only cookie |
| `SESSION_HTTP_ONLY` / `SESSION_SAME_SITE` | `true` / `lax` | cookie flags |
| `MAIL_MAILER` | `log` dev / `smtp` prod | mail driver |
| `MAIL_HOST`/`MAIL_PORT`/`MAIL_USERNAME`/`MAIL_PASSWORD` | smtp creds | SMTP |
| `MAIL_ENCRYPTION` | `tls` | SMTP encryption |
| `MAIL_FROM_ADDRESS` | `noreply@...` | from address |

## `config.php` (repo-root SEO front controller; copy from `config.example.php`)

| key | meaning |
|---|---|
| `APP_ENV` | dev logging toggle |
| `INSTANT_APP_ID` | InstantID app id (currently used to read metadata) |
| `INSTANT_ADMIN_TOKEN` | InstantID admin token (read metadata) |
| `INSTANT_API_URI` | InstantID API override |
| `SITE_URL` | absolute public site URL, no trailing slash |
| `INDEX_HTML` | path to built SPA index.html |

> After Step 5, the SEO `index.php` no longer needs `INSTANT_APP_ID` /
> `INSTANT_ADMIN_TOKEN`; it reads metadata from Laravel/MySQL instead.

## Notes on ordering

1. Do **Step 2** (importer against real backup, local SQLite) as the **highest-priority
   single validation**. If that passes (it did), the import pipeline is proven.
2. Do **Step 3/4** (MySQL + shared-host deploy) before any flag-based
   frontend/end-to-end testing, because the SPA needs `/api/*` reachable.
3. Add flags incrementally in read → auth → write order, not all at once, so each is
   verifiable and reversible.
4. Keep InstantID fully available as rollback until the post-cutover window closes.

---

# MANUAL / EXTERNAL WORK CHECKLIST

> **Owner:** operator with access to the InstantDB backup and shared hosting.
> These cannot be completed from this development workspace. Check each box only
> after running and verifying the command/result. InstantDB must remain available
> until the final post-cutover checkbox.

## ✅ Completed by you: real backup import into local SQLite

- [x] From `backend/` on your local Windows machine, run:
  ```powershell
  php artisan instant:import ..\instant-backup-2026-08-21T02-56-20-000Z.zip --truncate
  ```
- [x] Confirm the post-import report matches `config.json`.
- [x] Confirmed result: 7 orphaned records skipped, including 1 trip membership,
  1 task, and 5 comments; all other records imported.

## 1. Download/retain the final InstantDB export

**Where:** local operator machine, with InstantDB CLI credentials.

```powershell
npx instant-cli@latest backup list
npx instant-cli@latest backup download --latest --out instant-final.zip
```

**Does:** downloads a final point-in-time export containing schema, rules, entities,
and files. Store it securely; it contains user email addresses.

- [ ] Downloaded final export immediately before the production freeze.
- [ ] Recorded filename, timestamp, and SHA-256 checksum.

```powershell
Get-FileHash .\instant-final.zip -Algorithm SHA256
```

## 2. Provision staging MySQL

**Where:** hosting control panel / phpMyAdmin, then shared-host SSH.

- [ ] Create an empty staging database and database user.
- [ ] Grant that user access only to the staging database.
- [ ] Record the database host, port, name, username, and password.

**Where:** shared-host SSH, `backend/` directory.

```bash
cd ~/path/to/ikuyo/backend
cp .env.mysql.example .env
chmod 600 .env
# edit .env with staging DB_* and SMTP values
php -v
composer --version
php -m | grep -Ei 'curl|mbstring|pdo_mysql|xml|zip'
php artisan key:generate
php artisan migrate:fresh --force
```

**Does:** installs Laravel's dependencies, confirms PHP 8.4/extensions, creates the
MySQL schema, and prepares an empty staging database.

- [ ] `php artisan migrate:fresh --force` completed on staging only.
- [ ] `php artisan about` shows the expected environment/database.

## 3. Import the real backup into staging MySQL

**Where:** shared-host SSH, `backend/`; upload the ZIP first via SCP/SFTP or the
hosting file manager.

```bash
cd ~/path/to/ikuyo/backend
php artisan instant:import /home/account/backups/instant-final.zip \
  --dry-run --verify-config --json
```

**Does:** parses the export without writing and fails if expected `config.json`
entity counts do not match JSONL files.

```bash
php artisan instant:import /home/account/backups/instant-final.zip --truncate
```

**Does:** imports users, trips, memberships, children, tasks, comments, and links into
staging MySQL. Review both the orphan warnings and the post-import report.

- [ ] Dry-run counts all match.
- [ ] Import completes without SQL errors.
- [ ] Only understood orphan records are skipped.
- [ ] Post-import counts are saved as a migration artifact.
- [ ] Sample IDs from Instant exist in MySQL.

## 4. Deploy and route Laravel on shared hosting

**Where:** shared-host SSH/control panel.

```bash
cd ~/path/to/ikuyo/backend
composer install --no-dev --optimize-autoloader --prefer-dist
php artisan config:clear
php artisan config:cache
php artisan migrate --force
php artisan route:list --path=api
```

Configure the host:

- [ ] Laravel `backend/public` is the document root for the API host/path.
- [ ] `/api/*` reaches Laravel's `backend/public/index.php`.
- [ ] Existing root SPA/SEO routes still reach the root `index.php`.
- [ ] Static assets still load directly.
- [ ] `backend/storage` and `backend/bootstrap/cache` are writable.
- [ ] `.env` is outside the public webroot and is not downloadable.
- [ ] `APP_DEBUG=false`.
- [ ] `/up` returns HTTP 200.

```bash
curl -i https://staging.example.com/up
curl -i https://staging.example.com/api/auth/me
curl -i https://staging.example.com/api/trips/public
```

## 5. Verify SMTP/password recovery

**Where:** staging HTTPS site and shared-host Laravel environment.

```bash
cd ~/path/to/ikuyo/backend
php artisan config:clear
php artisan config:cache
```

- [ ] Set `MAIL_MAILER=smtp` and real staging SMTP values in `backend/.env`.
- [ ] Request password reset for an existing user.
- [ ] Confirm email arrives and link opens the React reset screen.
- [ ] Complete password reset and log in.
- [ ] Request reset for an unknown address; response remains generic.
- [ ] Confirm raw reset tokens do not appear in Laravel logs.

## 6. Run the complete staging E2E test

**Where:** browser against staging HTTPS, with backend API and React build deployed.

Build from the **repo root** with the flags below in the root build environment:

```dotenv
IKUYO_API_URL=https://staging.example.com
IKUYO_BACKEND_TRIP_READS=true
IKUYO_BACKEND_AUTH=true
IKUYO_BACKEND_TRIP_WRITES=true
IKUYO_BACKEND_ACTIVITY_WRITES=true
IKUYO_BACKEND_CONTENT_WRITES=true
IKUYO_BACKEND_TASK_WRITES=true
IKUYO_BACKEND_SHARING_WRITES=true
IKUYO_READ_ONLY_MODE=false
IKUYO_MAINTENANCE_MODE=false
```

```bash
cd ~/path/to/ikuyo
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
```

- [ ] Existing email user can log in.
- [ ] Guest can create an account and retain its session.
- [ ] Guest can upgrade to email/password.
- [ ] Password recovery works.
- [ ] Trips list/detail render from MySQL.
- [ ] Create/update/delete/duplicate trip works.
- [ ] Public/private/viewer/editor/owner permissions match expectations.
- [ ] Activities, accommodation, macroplan, and expenses CRUD works.
- [ ] Drag/resize, duplicate, and swap-day work.
- [ ] Tasks CRUD, reorder, and move work.
- [ ] Comments create/edit/delete/resolve work.
- [ ] Delete operations do not leave comment graph rows.
- [ ] Two browser tabs converge through periodic sync/tombstones.

## 7. Repoint SEO metadata

**Where:** repo root `index.php`/`app/`, deployed on staging first.

- [ ] Change the root SEO controller's InstantDB admin query to call:
  ```text
  GET https://staging.example.com/api/metadata/trips/{tripId}
  ```
- [ ] Preserve `sharing_level >= 2` public-only behavior.
- [ ] Test public, private, missing, malformed, and nested `/trip/{id}` routes.
- [ ] Confirm private titles/dates are never present in HTML metadata.
- [ ] Keep root `config.php` out of git and remove Instant admin credentials only
  after the SEO switch has been verified.

## 8. Production freeze and final import

**Where:** production deployment/operator machine.

1. Announce a maintenance window.
2. Set the root build environment:
   ```dotenv
   IKUYO_READ_ONLY_MODE=true
   ```
3. Deploy/read-only the frontend so users cannot mutate data.
4. Enable InstantDB read-only mode in the Instant dashboard.
5. Wait for in-flight mutations to finish.
6. Download the final export (manual Step 1).
7. Run dry-run verification against the final ZIP.
8. Import into the empty production MySQL database:
   ```bash
   cd ~/path/to/ikuyo/backend
   php artisan instant:import /home/account/backups/instant-final.zip --truncate
   ```
9. Save the post-import report.

- [ ] Instant writes are frozen before final export.
- [ ] Final import counts/report reviewed.
- [ ] Production MySQL data spot-checked.
- [ ] No client is writing to Instant after the freeze.

## 9. Production cutover and rollback window

**Where:** production shared host + HTTPS browser.

Set root build environment to:

```dotenv
IKUYO_BACKEND_TRIP_READS=true
IKUYO_BACKEND_AUTH=true
IKUYO_BACKEND_TRIP_WRITES=true
IKUYO_BACKEND_ACTIVITY_WRITES=true
IKUYO_BACKEND_CONTENT_WRITES=true
IKUYO_BACKEND_TASK_WRITES=true
IKUYO_BACKEND_SHARING_WRITES=true
IKUYO_READ_ONLY_MODE=false
IKUYO_MAINTENANCE_MODE=false
```

- [ ] Deploy API and React build.
- [ ] Confirm `/api/*` and SEO routing.
- [ ] Run the complete E2E matrix again on production HTTPS.
- [ ] Confirm writes appear in MySQL.
- [ ] Confirm sync events/tombstones advance.
- [ ] Monitor Laravel logs, HTTP 4xx/5xx, mail delivery, and DB errors.
- [ ] Keep InstantDB read-only and all Instant source/dependencies available for rollback.
- [ ] Do not delete anything yet; observe for at least the agreed rollback window.

## 10. Decommission InstantDB

**Where:** local repo and production configuration, only after stable operation.

- [ ] Confirm rollback window has passed without data/API/auth issues.
- [ ] Take/verify the hosting MySQL backup.
- [ ] Remove Instant feature flags and environment variables.
- [ ] Remove `@instantdb/admin`, `@instantdb/core`, and Instant CLI dependency when no
  scripts need them.
- [ ] Remove InstantDB fallback code from React stores/domain helpers.
- [ ] Archive `instant.schema.ts`, `instant.perms.ts`, and the final export.
- [ ] Remove Instant admin credentials from hosting.
- [ ] Stop/decommission the Instant app only after confirming no clients use it.
