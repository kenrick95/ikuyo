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


### ✅ 1. Full API response contract (implemented; staging validation remains)

The full-trip response is normalized through `src/data/apiTrip.ts` and backend feature
coverage exists. A real staging run should still compare every field against production.

- Normalize all nested entities from snake_case to the exact frontend camelCase shape.
- Normalize `taskLists/tasks` to `taskList/task` where required.
- Normalize `commentGroups/comments/objects` to the existing comment-store shape.
- Apply section visibility to every endpoint, not only full-trip serialization.
- Avoid exposing member email addresses to unauthorized viewers.
- Add complete contract fixtures for every entity.

### ✅ 2. Authorization implementation (implemented; expand staging matrix)

Authorization middleware and route checks are present, with core tests. The staging
matrix should still exercise every role/resource combination:

- Public anonymous reads.
- Viewer reads and hidden sections.
- Viewer/editor/owner mutations.
- Cross-trip entity IDs.
- Member management edge cases.
- Comment edit/delete ownership.
- Guest account ownership.

### 3. Import validation against a real Instant backup

The importer now supports `--dry-run --json --verify-config` and the synthetic complete
entity graph is covered by regression tests. The remaining validation requires the
actual downloaded production backup. Before go-live it must handle and verify:

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

### 4. Import-to-production cutover tooling

Still needed:

- A documented staging import procedure.
- A final-backup command/checklist.
- Import validation report with counts and checksums.
- A way to prevent writes during final import.
- A clear rollback procedure before enabling Laravel writes.

### ✅ 5. Frontend migration adapters (implemented; enable/test flags)

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

### ✅ 6. Realtime replacement decision

Realtime is intentionally not required. The current target is:

- Optimistic local update for the current user's own write.
- Refetch after mutation.
- Refetch on navigation and browser focus.
- Optional `GET /api/sync` polling every 30–60 seconds.

The sync endpoint exists, but the full trip store does not yet merge or consume its
changes automatically. This should be completed or explicitly deferred before go-live.

### 7. SEO front controller repoint

The existing PHP SEO front controller still reads InstantDB's admin API. It must be
changed to read MySQL/Laravel data before InstantDB is shut down.

### 8. Production deployment verification

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

### 9. Remaining production security review

Before enabling the backend for real users:

- Use Laravel's standard password-reset notifications/mailables instead of logging
  reset tokens.
- Rate-limit login, guest creation, forgot-password, handle generation, and sync.
- Confirm CSRF behavior for same-origin React requests.
- Validate request bodies with Form Requests rather than broad `$request->except()`.
- Replace broad `$guarded = []` on models with explicit `$fillable` or DTOs.
- Add authorization tests to all write controllers.
- Decide whether sessions should use Laravel's database driver or encrypted cookies.
- Ensure logs never contain reset tokens or sensitive user data.

### 10. Frontend build/runtime configuration

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
3. Run the now-tested importer against a real backup and staging MySQL.
4. Complete frontend auth/store read fallback and periodic refresh behavior.
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
