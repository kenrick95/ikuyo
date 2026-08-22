# Ikuyo! Backend Migration — Implementation Tech Doc

> **Purpose:** a concrete, implementable blueprint for replacing InstantDB with a
> Laravel (PHP 8.4) + MySQL backend for the Ikuyo React app.
>
> **Companion docs:**
> - `docs/migration/php-mysql-migration.md` — strategy, phases, schema, auth, data-import path
> - `docs/migration/api-endpoints.md` — the exact endpoint list this doc implements
> - `backend/` — runnable Laravel 13 skeleton (SQLite), models + migrations demo
>
> **Decision that shaped this doc:** the frontend keeps working with **zero rewrite**.
> The migration is a *data + API* swap: every `db.*` call maps to an HTTP call via a
> thin client adapter. We deliberately avoid touching UI components.

---

## 1. Goals & non-goals

**Goals**
1. Replace all `db.query*` / `db.transact*` / `db.subscribe*` calls with HTTP calls to
   a Laravel API.
2. Migrate all data from InstantDB backups into MySQL with full fidelity (IDs, ms
   timestamps, polymorphism).
3. Implement auth: password + guest accounts + password recovery (per product).
4. No realtime — fetch-on-load + optional `/api/sync` polling.
5. Keep the existing `index.php` SEO front controller working (it reads InstantDB admin
   API today; repoint it at MySQL in Phase 4).

**Non-goals**
- Rewriting the React UI.
- Realtime/WebSockets.
- Multi-tenant scaling; this is a small single-app backend.
- Devops beyond shared-hosting constraints (SSH + Composer available, no VPS).

---

## 2. Architecture

```
┌─────────────┐   HTTPS   ┌─────────────────────────────┐      ┌──────────┐
│ React SPA   │──────────►│ Laravel (PHP 8.4, JSON API) │─────►│  MySQL   │
│ (no rewrite)│           │  /api/*  (auth, CRUD, sync) │      └──────────┘
└─────────────┘           └─────────────────────────────┘
   ▲                          │
   │  index.php SEO front     │ (kept from feat/php-metadata-service)
   │  controller (OG tags)    └─ reads MySQL for public trip metadata
   └──────────────────────────┘
```

- **Laravel 13** (already scaffolded in `backend/`, Composer-managed).
- Laravel is configured as a **JSON-only API**:
  - `routes/api.php` (registered via `withRouting(api:)` in `bootstrap/app.php` — do
    *not* re-add `/api` inside the file — that bug is already fixed in the skeleton).
  - Global API error responses via `shouldRenderJsonWhen(request->is('api/*'))`.
- **Docroot** points at Laravel's `public/`; the SEO `index.php` front controller sits
  beside it for SPA HTML + OG. `index.php` keeps its own `config.php` (separate from
  Laravel's `.env`).
- **Stateless-ish**: session-based auth via Laravel sessions (cookie) is fine for a
  same-origin SPA; Sanctum adds token support if the SPA is cross-origin later.

---

## 3. Repository layout (target)

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php          # login/logout/forgot/reset/guest/upgrade/me
│   │   │   ├── TripController.php          # index/public/show/store/update/destroy/duplicate
│   │   │   ├── TripSharingController.php   # members add/update/remove; sharing/section toggles
│   │   │   ├── ActivityController.php      # + drag-end + duplicate-op
│   │   │   ├── AccommodationController.php
│   │   │   ├── MacroplanController.php
│   │   │   ├── ExpenseController.php
│   │   │   ├── TaskController.php          # task lists, tasks, reorder, move
│   │   │   ├── CommentController.php       # groups + comments
│   │   │   └── UserController.php          # me, by-handle, prefs, check-email, generate-handle
│   │   └── Middleware/
│   │       └── AuthorizeTripAccess.php     # central per-trip permission gate
│   ├── Models/
│   │   ├── User.php  Trip.php  TripUser.php
│   │   ├── Activity.php  Accommodation.php  Macroplan.php  Expense.php
│   │   ├── TaskList.php  Task.php
│   │   ├── Comment.php  CommentGroup.php  CommentGroupObject.php
│   │   └── Enums/ (TripSharingLevel, TripUserRole, CommentObjectType, TaskStatus)
│   ├── Services/
│   │   ├── TripGraphService.php    # assembles GET /trips/{id} nested response
│   │   ├── TripDuplicateService.php# deep-copy + date-shift logic
│   │   ├── TripPermsService.php    # authorization evaluation (mirror instant.perms.ts)
│   │   ├── HandleGenerator.php     # unique handle logic (mirror src/User/handle.ts)
│   │   └── SyncFeedService.php     # optional /api/sync deltas
│   └── Console/Commands/
│       ├── ImportInstantBackup.php # .jsonl → MySQL import (see §8)
│       └── SyncMirrorFromInstant.php # re-import during read-only ramp
├── bootstrap/app.php               # routes, middleware, JSON errors
├── config/                         # .env-driven
├── database/
│   ├── migrations/                 # schema (see §5)
│   ├── seeders/                    # TripsSeeder (exploration)
│   └── factories/
├── routes/api.php                  # all routes
└── tests/Feature/Api/*             # feature tests per resource
```

---

## 4. Dependencies & setup

```bash
cd backend
composer require laravel/sanctum    # token auth if needed (skip if same-origin sessions suffice)
composer require --dev phpunit/phpunit  # (already present)
composer require laravel/tinker        # (already present)
```

- PHP 8.4 + extensions verified: `curl mbstring pdo_mysql pdo_sqlite dom zip xml intl gd`
- MySQL connection via `.env`: `DB_CONNECTION=mysql`, `DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD`.
- Switch from SQLite (exploration) → MySQL is a `.env` change; the schema is
  driver-agnostic (use `bigInteger` for ms timestamps, `string` for ids).
- Pest/PHPUnit for tests (Pest is lighter; PHPUnit 12 is already in dev deps — stick
  with PHPUnit to avoid adding a test framework).

---

## 5. Data model (final, MySQL)

Mirrors `docs/migration/php-mysql-migration.md` §3 — summarized here with Eloquent notes.

### Tables & relationships

| Table | Eloquent model | Key columns | Relationships |
|---|---|---|---|
| `users` | `User` | `id` (string 40), `email` unique, `handle` unique, `handle_key` unique, `auth_namespace_id` unique nullable, `password_hash` nullable, `reset_token` nullable, `reset_token_at` nullable, `activated` bool, `last_login_at` bigint nullable, prefs, `created_at/updated_at` bigint | `trips()` belongsToMany via `trip_user` w/ pivot `role` |
| `trips` | `Trip` | `id` string, title, region, currency, timezone, `timestamp_start_ms`, `timestamp_end_ms`, `sharing_level` tinyint, `public_show_*/viewer_show_*` nullable bool, ms timestamps | `activities()`,`accommodations()`,`macroplans()`,`expenses()` hasMany; `users()` belongsToMany; `taskLists()` hasMany; `commentGroups()` hasMany; `comments()` morphMany |
| `trip_user` | `TripUser` | `id` string, `trip_id`, `user_id`, `role` tinyint (enum → 0 owner/1 editor/2 viewer), ms | belongsTo Trip, belongsTo User |
| `activities` | `Activity` | `id`, `trip_id`, title, location, geo, dest-geo, description, ms range + tz strings, flags int, icon, ms | belongsTo Trip; morphMany comments |
| `accommodations` | `Accommodation` | `id`, `trip_id`, name, address, phone, notes, check-in/out ms + tz, geo, ms | belongsTo Trip; morphMany comments |
| `macroplans` | `Macroplan` | `id`, `trip_id`, name, notes, ms range + tz, ms | belongsTo Trip; morphMany comments |
| `expenses` | `Expense` | `id`, `trip_id`, amount, amount_in_origin, currency, conversion_factor, title, description, incurred ms + tz, ms | belongsTo Trip; morphMany comments |
| `task_lists` | `TaskList` | `id`, `trip_id`, title, `index`, status tinyint, ms | belongsTo Trip; hasMany tasks |
| `tasks` | `Task` | `id`, `task_list_id`, `index`, title, description, status, due_at ms, completed_at ms, ms | belongsTo TaskList; morphMany comments |
| `comment_groups` | `CommentGroup` | `id`, `trip_id`, status tinyint, ms | belongsTo Trip; hasMany comments; hasOne object (CommentGroupObject) |
| `comment_group_objects` | `CommentGroupObject` | `id` (= group id), `comment_group_id`, `object_type` tinyint, `object_id`, ms | belongsTo CommentGroup |
| `comments` | `Comment` | `id`, `comment_group_id`, `user_id`, content, ms | belongsTo CommentGroup, belongsTo User |
| `sessions` (Sanctum) | — | token, user | — |

Key Eloquent patterns (already demos in `backend/app/Models/`):
- `Trip::belongsToMany(User::class, 'trip_user')->withPivot('role')`
- `Activity::morphMany(Comment::class, 'commentable')`
- `Comment::morphTo()`

### Polymorphism note
The frontend's `commentGroupObject` is **object_type + object_id** (not a native
Laravel polymorphic relation). Two options:
1. **Native morphs** (`commentable_type`/`commentable_id` on a `comments` table) — but
   the frontend nests comments under a *group*, and groups point at *objects* (trip/
   activity/...). So the morph relationship lives on **`comment_group_objects`**
   (`object_type` → model, `object_id`), with `CommentGroup` having one object and many
   comments. This matches the plan's schema; keep it explicit with an accessor in
   `CommentGroupObject`.
2. **Manual mapping** via `objectType` → model map in a service. Simplest and most
   faithful to the frontend shape. **Recommendation: manual map** (a `CommentObjectType`
   enum + `resolveTarget(Model|string, id)` helper).

---

## 6. AuthorizeTripAccess middleware (permission parity)

Mirror `instant.perms.ts` as a middleware applied to all trip-scoped routes. It binds
`$trip` to the route and sets a `TripAccess` value-object:

```php
// app/Http/Middleware/AuthorizeTripAccess.php
public function handle(Request $request, Closure $next, string $ability = 'view'): mixed
{
    $trip = $request->route('trip');               // already-loaded Trip
    $user = $request->user();
    $member = $trip->users()->where('users.id', $user?->id)->first();
    $role = $member?->pivot->role ?? null;

    // Permissions mirror instant.perms.ts:
    $isPublic          = $trip->sharing_level >= 2;
    $isViewer          = $role === 'viewer';
    $isEditor          = $role === 'editor';
    $isOwner           = $role === 'owner';

    $canView = $isPublic || $isViewer || $isEditor || $isOwner;
    $canEdit = $isEditor || $isOwner;
    $canManage = $isOwner;                          // sharing, delete

    $request->attributes->set('tripAccess', TripAccess::from($role, $trip, $canView, $canEdit, $canManage));
    return $next($request);
}
```

Routes map ability → which CRUD is allowed:
- `view` → GET endpoints
- `edit` → content mutations (activity/accommodation/macroplan/expense/task/comment)
- `manage` → trip delete, sharing, member add/remove, tripUser role change

**Section visibility** is enforced at serialization time (not middleware):
`TripGraphService` omits `expenses`/`taskLists`/`commentGroups` when
`!publicShow*` for public visitors, or `!viewerShow*` for viewer members (undefined ⇒
visible).

---

## 7. Auth & sessions

Endpoints (see §1 of api-endpoints.md): `POST /auth/forgot|reset|login|logout|guest|upgrade`,
`GET /auth/me`.

Implementation notes:
- **Guest session:** create `users` row with a generated handle (via
  `HandleGenerator`), no email, `activated=true`, then issue a session cookie.
  Persist across reloads.
- **Upgrade:** after login-with-email or guest-upgrade, set `email` on the guest row,
  `password_hash` (if password), `activated=true`, and record `last_login_at` ms.
- **Password recovery:** `forgot` generates `reset_token` (`bin2hex(random_bytes(32))`),
  stores hash + `reset_token_at = now+1h`, emails a link with `?reset_token=...`;
  `reset` verifies + sets `password_hash` and clears token. **Always return `{ok:true}`**
  from `forgot` to avoid user enumeration.
- **`GET /auth/me`** returns the `users` row shaped like `src/Auth/store.ts` expects:
  `{id, handle, email, activated, createdAt, lastUpdatedAt, lastLoginAt, prefs...}`.
- Sessions: Laravel's built-in `web` guard with `database` session driver. Set
  `SESSION_SECURE_COOKIE=true` on HTTPS, `HttpOnly`, `SameSite=Lax`.
- CORS only if the SPA is cross-origin (it isn't — same host, `/index.html` + `/api`).

Edge cases ported from `src/Auth/store.ts`:
- Guest without email upgrading → `isEmailTakenByOtherUser` check (call
  `POST /api/users/check-email` before upgrade).
- Deleting a guest that was never activated → `users.activated=false` → delete or
  soft-delete row.

---

## 8. Data import (Instant backup → MySQL)

Full details in the migration plan §6. Implementation in `ImportInstantBackup`
command:

1. Download backup zip: `npx instant-cli@latest backup download --latest`.
2. Parse `config.json` (entity counts) + `entities/*.jsonl`.
3. **Insert in topological order** (FK parents first):
   ```
   users → trips → trip_user → activities/accommodations/macroplans/expenses
       → task_lists → tasks → comment_groups → comment_group_objects → comments
   ```
4. Per-line: `{"entity": {...}, "createdAt": ...}` → map Instant field names to
   columns; link keys (`trip`, `object`) become FKs; has-many arrays expand into join
   rows.
5. **ID preservation:** keep Instant's `id` strings exactly (`users.auth_namespace_id`
   from the `$users`/`user$$users` link).
6. **Timestamp coercion:** ms-epoch for most; `lastLoginAt` is an Instant date string →
   parse to ms once.
7. Verify: row counts == `config.json` counts; spot-check trip IDs end-to-end.

During the read-only ramp, `SyncMirrorFromInstant` re-imports delta rows on a schedule
so reads stay fresh until write-cutover.

---

## 9. API implementation order (build sequence)

Follow dependency-first order so each stage is testable:

1. **Migrations + models** (§5) — create all tables, relationships.
2. **TripAccess middleware + PermsService** (§6).
3. **Auth** (guest/login/upgrade/reset/me) — needed before any trip reads that require
   membership.
4. **Reads:**
   - `GET /api/trips/{id}` via `TripGraphService` (the big one — verify against the
     frontend's `subscribeTrip` query shape).
   - `GET /api/trips` (my trips, active/past, paginated via cursor).
   - `GET /api/trips/public` (directory, limit 12, cursor, ownerHandle + activityCount).
   - `GET /api/users/me`, `by-handle`, `check-email`, `generate-handle`.
5. **Writes:**
   - Trips: store/update/destroy/duplicate (transactional).
   - Members: add/update/remove (roles).
   - Content: activities/accommodations/macroplans/expenses CRUD + drag-end + duplicate.
   - Tasks: lists/tasks CRUD + reorder + move.
   - Comments: group+comment create (atomic), status, edit, delete (group-if-empty).
   - Users: preferences, handle/email update.
6. **Sync (optional):** `GET /api/sync?since=<ms>&scope=tripId` returning
   `[{entity,id,updatedAt,op}]` deltas (soft-deletes for `op:'delete'`).
7. **SEO repoint:** `index.php` reads `sharing_level>=2` trip from MySQL instead of
   Instant admin API (Phase 4).

---

## 10. Frontend adapter (the zero-rewrite shim)

A thin client in `src/data/apiClient.ts` replacing `src/data/db.ts`:

```ts
// Concept — same db.* signatures, HTTP underneath (fetch)
export const db = {
  queryOnce(query)  { return httpPost('/api/query', query); },      // or explicit endpoints
  transact(chunks)  { return httpPost('/api/transact', chunks); },
  subscribeQuery(query, cb) { return pollOnChange(query, cb); },
  subscribeAuth(cb) { return onAuthChange(cb); },
  auth: { signInWithPassword, signOut, ... },
};
```

Two options:
- **A: explicit REST adapter** — map each `db.*` call to the api-endpoints doc (§3).
  More code but type-safe and matches the Laravel controllers 1:1.
- **B: generic JSON endpoint** — a single `/api/query` + `/api/transact` that mimics
  InstaQL. Faster to switch, but couples Laravel to Instant's query language and leaks
  abstraction.

**Recommendation: A** — the endpoints doc is written for it, and it keeps Laravel
idiomatic. The adapter is the *only* frontend change (plus converting `subscribe*` →
fetch, which the store refactor in migration plan §4 Phase 3 covers).

Subscriptions → one-shot fetch + optional polling:
- `subscribeTrip(tripId)` → `GET /api/trips/{id}` on mount + refetch on navigation/
  focus/after-mutation (optimistic local writes).
- `subscribeTrips(currentUserId, now)` → `GET /api/trips?now=...`.
- `subscribeTripsPublic()` → `GET /api/trips/public&cursor=...` with `loadMore`.
- `subscribeAuth` → `GET /api/auth/me` + listen to session cookie events.

---

## 11. Testing strategy

- **PHPUnit feature tests** per resource (Laravel `RefreshDatabase`, SQLite or MySQL
  test DB):
  - Auth: login/guest/upgrade/reset happy + failure paths.
  - TripAccess: viewer can't edit, owner can, public viewer sees only allowed sections.
  - CRUD: create/update/delete each entity; reorder; move task; comment cascade.
  - Import: feed a fixture `.jsonl` backup → assert row counts + FK integrity.
- **API contract tests:** assert JSON shapes match the frontend's `db.ts` types
  (mirror the `subscribeTrip` query's nested shape). This is the highest-value guard —
  it's what prevents a silent frontend break.
- **Live smoke:** `php artisan serve` + curl the endpoints (already proven in skeleton).

---

## 12. Shared-hosting deployment

1. `composer install --no-dev --optimize-autoloader --prefer-dist` (remove dev
   tooling; `--no-dev` means no phpunit/pint on prod).
2. `php artisan config:cache`, `php artisan route:cache` — **only after** converting
   closure routes to controller-action style (route cache doesn't support closures).
3. `php artisan migrate --force` → MySQL.
4. Set `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`,
   `DB_*`, mail config.
5. Docroot = `backend/public/`; keep static SPA assets + SEO `index.php` beside it.
   `.htaccess` routes non-file/non-dir to `index.php` (SEO) which returns the SPA HTML
   (with OG tags) — `/api/*` is caught by Laravel's `public/index.php`? **No:** the SEO
   front controller and Laravel both want `index.php`. Resolve by `RewriteRule ^api/`
   → Laravel's `public/index.php`, everything else static or SEO controller.
6. Writable: `storage/`, `bootstrap/cache/`.
7. Backups: hosting's weekly MySQL dumps suffice (per product).

---

## 13. Milestones (weekly-checkable)

| # | Milestone | Exit criteria |
|---|---|---|
| M1 | Schema + models + TripAccess | migrations apply; middleware unit-tested |
| M2 | Auth (guest/login/upgrade/reset/me) | curl flow works end-to-end |
| M3 | Read API (trip detail, my trips, public) | JSON matches frontend shapes |
| M4 | Write API (all CRUD + cascade + reorder) | feature tests green |
| M5 | Data import command (backup → MySQL) | counts match; IDs intact |
| M6 | Frontend adapter swap (read first, then write) | SPA runs against Laravel |
| M7 | Sync endpoint + SEO repoint | public OG from MySQL |
| M8 | Cutover: freeze Instant, final import, flip writes | Instant decommissioned |

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Frontend JSON-shape drift | API contract tests mirroring `db.ts` types |
| Date-shift logic in duplicate | Port `duplicateTripDateShift.ts` + its unit tests into `TripDuplicateService` |
| Polymorphic comments mismatch | Manual `object_type` → model map + contract test on nested `object` |
| Closure routes block `route:cache` | Use controller-action routes for `routes/api.php` |
| Import ordering / FK integrity | Topological insert + count verification (`config.json`) |
| Staleness during read-only ramp | `SyncMirrorFromInstant` scheduled re-import; own-write optimistic |
| Shared-hosting file perms | Pre-deploy check `storage/` writability; `php artisan optimize` |

---

## 15. Open decisions to confirm before build

1. **IDs:** keep Instant's `VARCHAR(40)` string ids (recommended — frontend + links
   depend on them) vs. switch to Laravel autoincrement. **Recommendation: keep.**
2. **`lastLoginAt` coercion:** accept Instant's date-string → store as ms `BIGINT`
   (recommended) vs. keep `DATETIME`.
3. **Sync endpoint:** build now (recommended, cheap) or defer.
4. **Sanctum vs sessions:** same-origin SPA → sessions is enough; add Sanctum only if
   a token API client appears.
5. **Undo semantics:** frontend-local snapshot + normal update (recommended) vs.
   server `undo` endpoints.