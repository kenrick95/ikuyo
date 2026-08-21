# Ikuyo! Migration Plan: InstantDB (Cloud) → MySQL + PHP

> **Goal:** Migrate the existing React + InstantDB app ("Ikuyo!") to a **MySQL + PHP** backend.
> **Reason:** InstantDB is being shut down.
> **Confirmed constraints (from product/ops):**
> 1. **Guest accounts are required.**
> 2. **Password-recovery UX is required.**
> 3. **No realtime sync needed** — fetch-on-load is fine.
> 4. **Shared hosting (Apache/LiteSpeed, PHP 8.4), no VPS.** A plain PHP front controller (`index.php`) already exists for SEO — that's our established deployment pattern.
> 5. **Backups:** hosting provider handles weekly MySQL dumps; no custom backup work needed.

---

## 0. Summary

Today the app is:

- **Frontend:** React + TypeScript, built with rsbuild, served as a static `index.html` behind an `.htaccess` SPA rewrite.
- **Backend/auth:** InstantDB cloud — Magic Link (email) login + Guest auth, plus a graph store defined in `instant.schema.ts`.
- **Persistence layer:** thin `db.ts` modules per domain (`Trip`, `Activity`, `Expense`, `Comment`, …) plus a zustand store and `subscribe*` subscriptions.
- **Existing PHP glue:** a front-controller `index.php` on `feat/php-metadata-service` reads InstantDB's admin HTTP API to render OpenGraph/SEO metadata for public trip shares. This establishes the hosting pattern and is a natural starting point for the new PHP backend.

Instant provides three categories of functionality we lose when we replace it with MySQL/PHP:

1. **Data** (entities + links) — maps cleanly onto relational rows + foreign keys. **Lowest risk.**
2. **Auth** (magic links, guest accounts, the `$users` namespace) — must be rebuilt in PHP. **High user impact — the main work.**
3. **Realtime** (subscriptions) — **not needed.** The frontend just fetches on load/refresh. This removes what would otherwise be the hardest part of a plain-PHP migration.

This plan treats each remaining piece separately so the project ships incrementally rather than as a "big bang" rewrite.

---

## 1. Target architecture

```
Browser (React SPA)
   │   HTTP(S) ──────────►  Laravel JSON API  (/api/*)
   │                       + SEO front controller (index.php) serves SPA HTML/OG
   ▼
Laravel (Eloquent) → MySQL
```

- The static React build **stays the frontend** — no UI rewrite needed.
- Laravel is a pure **JSON API** under `/api/*` (data + auth). The existing `index.php` SEO front controller keeps serving the SPA HTML + OpenGraph metadata.
- Auth uses Laravel sessions/Sanctum (cookies or HTTPS bearer tokens).
- **No realtime.** Reads are fetch-on-load; updates use the strategy in §5 (optimistic local writes + periodic sync + refetch on focus/navigation).

---

## 2. Framework / ORM recommendation

> Constraint update: SSH (limited command set) **and Composer are available** on the shared host. That removes the main blocker for Laravel. **No realtime** is still assumed, and hosting is still shared/LiteSpeed (no VPS).

### Recommended: **Laravel + Eloquent**
- This is the conventional PHP "best practice" and the right choice now that Composer + SSH work.
- **Routing, Eloquent ORM (relationships map 1:1 onto the Instant graph), migrations, Sanctum (token/session auth), validation, queue (for password-reset email), and scheduling** all come for free.
- **Deployment on shared hosting:** point the LiteSpeed/apache docroot at Laravel's `public/` folder, keep static SPA assets there, and expose Laravel as a pure JSON API under `/api/*`. The existing SEO `index.php` front controller can either be ported into a Laravel route/controller or kept alongside (Laravel handles `/api/*`, the front controller keeps serving SPA HTML + OG metadata).
- **Guardrails on limited SSH:** make sure `php artisan`, `storage/` and `bootstrap/cache/` are writable, register the route/api cache, and confirm `composer install --no-dev` works. This is routine for cPanel+LiteSpeed.

### If you prefer a lighter footprint (still valid)
- **plain PHP + PDO prepared statements**, continuing the functional pattern in the existing `index.php` metadata service (plain functions, `config.php`, cURL). Fine for a small read-heavy app; you give up ORM/queues/migrations and hand-roll auth/routing.
- **Slim 4** as a middleware + router middle ground if you want routing + CSRF without Laravel's weight.

**Recommendation:** given SSH + Composer are available, **start with Laravel + Eloquent + Sanctum**. Treat it as a JSON API only; React stays the SPA. If you'd rather stay dependency-light, plain PHP + PDO is a defensible fallback but you'll re-implement more.

### When we keep the `index.php` SEO front controller in play
- The metadata/SEO glue can keep serving SPA HTML + OG tags; Laravel handles `/api/*` (JSON data + auth). This keeps the proven, working SEO path untouched and isolates the new API surface.

### Security baseline (non-negotiable starting point)
- Eloquent/DB prepared statements everywhere (never raw `whereRaw` with user input).
- `password_hash()` / `password_verify()` for credentials.
- Server-side sessions (Laravel session store) with `HttpOnly`, `Secure`, `SameSite` cookies.
- CSRF tokens on all mutating endpoints (Sanctum/Sanctum + stateful).
- Output escaping for anything echoed into HTML (Laravel blade auto-escapes; keep the existing `escapeHtml()` where the SEO front controller is reused).

---

## 3. Data model: Instant graph → MySQL

### Mapping rules
1. **One Instant `entity` table ⇒ one MySQL table** (`user`, `trip`, `activity`, `expense`, `accommodation`, `macroplan`, `commentGroup`, `commentGroupObject`, `comment`, `taskList`, `task`, `tripUser`).
2. **Instant `links` become foreign keys:**
   - 1:N ⇒ an `FK` column on the "many" (child) side.
   - N:N joins (trip ↔ tripUser ↔ user) ⇒ pivot/join tables (with extra columns like `role`).
   - 1:1 (`commentGroup` ↔ `commentGroupObject`, `user` ↔ `$users`) ⇒ merge or a dedicated join table.
3. **IDs are UUID-like strings** — keep as `VARCHAR(40)` so existing client links stay valid.
4. **Timestamps:** Instant uses unix-millisecond ints. Store as `BIGINT`; keep timezone names as the schema strings. Do not force everything into `DATETIME`.
5. **Polymorphic comments:** a `commentGroup` points at one "object" (`commentGroupObject` ↔ trip/macroplan/activity/accommodation/expense/task). Model as `object_type` (enum) + `object_id`.

### Reference schema (MySQL 8+)

```sql
-- ──────────────────────────── Auth / users ────────────────────────────
CREATE TABLE users (
  id                 VARCHAR(40) PRIMARY KEY,   -- keep Instant app-user id
  email              VARCHAR(255) NULL UNIQUE,
  handle             VARCHAR(64) NOT NULL,
  handle_key         VARCHAR(64) NULL UNIQUE,       -- lowercased dedupe key
  auth_namespace_id  VARCHAR(40) NULL UNIQUE,        -- was the $users.id
  image_url          VARCHAR(1024) NULL,
  password_hash      VARCHAR(255) NULL,
  reset_token        VARCHAR(64) NULL,               -- one-time password-reset token
  reset_token_at     BIGINT NULL,                    -- expiry (ms)
  activated          BOOLEAN NOT NULL DEFAULT 1,
  preferred_region   VARCHAR(8)  NULL,
  preferred_currency VARCHAR(8)  NULL,
  preferred_timezone VARCHAR(64) NULL,
  last_login_at      BIGINT NULL,
  created_at         BIGINT NOT NULL,
  last_updated_at    BIGINT NOT NULL
);

-- guest sessions: short-lived cookie token keyed to a users row
CREATE TABLE sessions (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    VARCHAR(40) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,   -- store hash, not the raw token
  user_agent VARCHAR(255) NULL,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ──────────────────────────── Trips ────────────────────────────
CREATE TABLE trips (
  id                    VARCHAR(40) PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  region                VARCHAR(8)   NOT NULL,
  currency              VARCHAR(8)   NOT NULL,
  origin_region         VARCHAR(8)   NULL,
  origin_currency       VARCHAR(8)   NULL,
  origin_timezone       VARCHAR(64)  NULL,
  timezone              VARCHAR(64)  NOT NULL,
  timestamp_start_ms    BIGINT NOT NULL,
  timestamp_end_ms      BIGINT NOT NULL,
  sharing_level         TINYINT NOT NULL DEFAULT 0,  -- 0 private, 2 public-unlisted, 3 public-listed
  public_show_expenses  BOOLEAN NULL,
  public_show_tasks     BOOLEAN NULL,
  public_show_comments  BOOLEAN NULL,
  viewer_show_expenses  BOOLEAN NULL,
  viewer_show_tasks     BOOLEAN NULL,
  viewer_show_comments  BOOLEAN NULL,
  created_at            BIGINT NOT NULL,
  last_updated_at       BIGINT NOT NULL,
  INDEX idx_trips_sharing (sharing_level, timestamp_end_ms)
);

-- N:N trip <-> user, with the role attribute on the pivot
CREATE TABLE trip_user (
  id              VARCHAR(40) PRIMARY KEY,
  trip_id         VARCHAR(40) NOT NULL,
  user_id         VARCHAR(40) NOT NULL,
  role            ENUM('owner','editor','viewer') NOT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_trip_user (trip_id, user_id)
);

CREATE TABLE activities (
  id                     VARCHAR(40) PRIMARY KEY,
  trip_id                VARCHAR(40) NOT NULL,
  title                  VARCHAR(255) NOT NULL,
  location               VARCHAR(255) NOT NULL DEFAULT '',
  location_lat           DOUBLE NULL, location_lng DOUBLE NULL, location_zoom TINYINT NULL,
  location_dest          VARCHAR(255) NULL,
  location_dest_lat      DOUBLE NULL, location_dest_lng DOUBLE NULL, location_dest_zoom TINYINT NULL,
  description            TEXT NOT NULL,
  timestamp_start_ms     BIGINT NULL,
  timestamp_end_ms       BIGINT NULL,
  timezone_start         VARCHAR(64) NULL,
  timezone_end           VARCHAR(64) NULL,
  flags                  INT NULL,
  icon                   VARCHAR(16) NULL,
  created_at             BIGINT NOT NULL,
  last_updated_at        BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE accommodations (
  id              VARCHAR(40) PRIMARY KEY,
  trip_id         VARCHAR(40) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  address         VARCHAR(512) NULL,
  phone_number    VARCHAR(64)  NULL,
  notes           TEXT NULL,
  check_in_ms     BIGINT NOT NULL,
  check_out_ms    BIGINT NOT NULL,
  tz_check_in     VARCHAR(64) NULL,
  tz_check_out    VARCHAR(64) NULL,
  loc_lat         DOUBLE NULL,
  loc_lng         DOUBLE NULL,
  loc_zoom        TINYINT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE macroplans (
  id                  VARCHAR(40) PRIMARY KEY,
  trip_id             VARCHAR(40) NOT NULL,
  name                VARCHAR(255) NOT NULL,
  notes               TEXT NULL,
  timestamp_start_ms   BIGINT NOT NULL,
  timestamp_end_ms     BIGINT NOT NULL,
  timezone_start      VARCHAR(64) NULL,
  timezone_end        VARCHAR(64) NULL,
  created_at          BIGINT NOT NULL,
  last_updated_at     BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE expenses (
  id                          VARCHAR(40) PRIMARY KEY,
  trip_id                     VARCHAR(40) NOT NULL,
  amount                      DECIMAL(12,2) NOT NULL,
  amount_in_origin_currency   DECIMAL(12,2) NOT NULL,
  currency                    VARCHAR(8) NOT NULL,
  currency_conversion_factor  DECIMAL(12,6) NOT NULL,
  title                       VARCHAR(255) NOT NULL,
  description                 TEXT NULL,
  timestamp_incurred_ms        BIGINT NOT NULL,
  timezone_incurred           VARCHAR(64) NULL,
  created_at                  BIGINT NOT NULL,
  last_updated_at             BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- ──────────────────────────── Comments ────────────────────────────
CREATE TABLE comment_groups (
  id              VARCHAR(40) PRIMARY KEY,
  trip_id         VARCHAR(40) NOT NULL,          -- commentGroup$trip is 1:N
  status          TINYINT NOT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- 1:1 commentGroup ↔ commentGroupObject, merged here.
CREATE TABLE comment_group_object (
  id               VARCHAR(40) PRIMARY KEY,       -- same value as comment_group.id
  comment_group_id VARCHAR(40) NOT NULL,
  object_type      ENUM('trip','macroplan','activity','accommodation','expense','task') NOT NULL,
  object_id        VARCHAR(40) NULL,
  created_at       BIGINT NOT NULL,
  last_updated_at  BIGINT NOT NULL,
  FOREIGN KEY (comment_group_id) REFERENCES comment_groups(id) ON DELETE CASCADE
  -- object_id is polymorphic; validate the type/id combination in the app layer.
);

CREATE TABLE comments (
  id              VARCHAR(40) PRIMARY KEY,
  comment_group_id VARCHAR(40) NOT NULL,
  user_id         VARCHAR(40) NULL,
  content         TEXT NOT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (comment_group_id) REFERENCES comment_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ──────────────────────────── Tasks ────────────────────────────
CREATE TABLE task_lists (
  id              VARCHAR(40) PRIMARY KEY,
  trip_id         VARCHAR(40) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  idx             INT NOT NULL,
  status          TINYINT NOT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id              VARCHAR(40) PRIMARY KEY,
  task_list_id    VARCHAR(40) NOT NULL,
  idx             INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT NULL,
  status          TINYINT NOT NULL,
  due_at_ms       BIGINT NULL,
  completed_at_ms BIGINT NULL,
  created_at      BIGINT NOT NULL,
  last_updated_at BIGINT NOT NULL,
  FOREIGN KEY (task_list_id) REFERENCES task_lists(id) ON DELETE CASCADE
);
```

> In practice create these via a `.sql` migration file you run once (shared hosting usually manages the DB via phpMyAdmin). This is the relational reference.

---

## 4. Gradual migration strategy (strangler-fig)

The goal is to **inch the load away from InstantDB onto MySQL** without a risky big-bang, keeping Instant running as the source of truth (and a rollback path) until the very end. Because reads and writes are independent, we cut them over in separate steps:

```
                 ┌─── Instant is AUTHORITATIVE for writes until write-cutover ───┐
React SPA ─────► │   reads:  mirror from MySQL      (switch over first)           │
                 │   writes: still go to Instant    (switch over last)            │
                 └────────────────────────────────────────────────────────────────┘
                       mirror
data  Instant ──backup──► MySQL  (periodic re-import, then freeze)
```

### Two-track cutover
1. **Read track first** — the SPA renders from MySQL while writes still land on Instant. This de-risks the biggest surface (all queries + the store rewrite) on live-like data.
2. **Write track second** — freeze Instant, backfill MySQL with the final backup, then route writes to Laravel. From here Instant is a read-only archive.

Because reads are served from a mirror, there is a short **staleness window**: a write the user just made on Instant won't be visible in the MySQL read until the next re-import. Mitigations for this window:

- For a **read-only ramp**, a re-import every few minutes (or on Horizon/cron) is fine and simple.
- The user's **own in-flight writes** still come from the write path (they wrote via Instant), so their UI stays consistent; it's *other* clients that see the lag.
- Once both tracks land on Laravel (write-cutover), staleness disappears because Laravel is the single writer to MySQL.

So the phased sequence below is really: **Phase 0–2** = read track (mirror + API + store), **Phase 3** = write track (auth + writes), **Phase 4** = freeze/cutover.

---

### Phase 0 — Bootstrap Laravel on the shared host
- [ ] Scaffold Laravel on the shared host (composer + limited SSH as discussed). Point the docroot at `public/`; keep static SPA assets + the SEO `index.php` front controller serving HTML/OG.
- [ ] Provision a fresh MySQL DB + credentials; ability to run migrations (`php artisan migrate`).
- [ ] Add schema from §3 via Eloquent migrations.
- [ ] Confirm email sending for the auth flows (Laravel mail via SMTP/Postmark).

**Exit:** Laravel boots, connects to MySQL, and migrations run on the shared host.

---

### Phase 1 — Read-only data path (mirror)
- [ ] **Import** an Instant backup into MySQL (see §6 Import path). Re-import periodically while in this phase.
- [ ] Implement **read-only endpoints** backing the store's reads:
  - `GET /api/trips?user_id=…` (my trips, incl. role)
  - `GET /api/trips/public` (public directory; `sharing_level=3` unless the caller is also a member)
  - `GET /api/trips/{id}` + nested `activities`, `accommodations`, `macroplans`, `expenses`, `task_lists/tasks`, `comments` (auth-gated visibility incl. `publicShow*` / `viewerShow*`)
  - `GET /api/users/me`, `/api/users/by-handle`, `GET /api/sync?since=<cursor>` (see §5 data-update strategy)
- [ ] Implement **access-control parity**, mirroring `instant.perms.ts` (trip visibility = public OR membership; section visibility = `publicShow…`/`viewerShow…` toggles; mutations require `editor`/`owner`).
- [ ] Add a thin **API-client adapter** on the React side so existing typed `db.ts` signatures keep compiling. Goal: replace the *bodies* of the db calls, **not** rewrite every UI component.

**Exit:** the SPA renders real trips from MySQL (feature-flagged read path).

---

### Phase 2 — Auth (email + guest + password recovery)
- [ ] Laravel auth: `login` / `logout` / `me` (session cookies; Sanctum for any token clients).
- [ ] **Password recovery UX** (required):
  - `POST /api/auth/forgot` → one-time `reset_token`, email a `?reset_token=…` link;
  - `POST /api/auth/reset` → `password_hash()` and clear the token.
- [ ] **Guest accounts** (required): newsletter-style guest creation without email; persistent session cookie; port the guest-handle / account-upgrade logic from `src/Auth/store.ts` so a guest can upgrade to email+password later.

**Exit:** login, guest, and password-recovery all work against Laravel, running in parallel with Instant for rollback.

---

### Phase 3 — Write track (mutations)
- [ ] Implement mutating endpoints for `dbAddTrip`, `dbAddActivity`, `dbUpdate*`, `dbDelete*`, `dbAddUserToTrip`, … with **CSRF**.
- [ ] Preserve atomic multi-table writes with DB transactions:
  - `dbAddTrip` (creates trip **and** owner `trip_user` in one transaction);
  - `dbDeleteTrip` (cascades all related rows).
- [ ] Run a final mirror/import right before switch-over so MySQL has all writes made on Instant up to now.

---

### Phase 4 — Freeze & cutover
- [ ] **Freeze writes** to Instant (read-only/admin mode); take the **final backup** (see §6 Import), re-import, and flip the SPA's write path to Laravel behind a feature flag.
- [ ] **No further Instant writes.** Instant becomes a read-only archive.
- [ ] Verify queries + auth + writes end-to-end from MySQL.
- [ ] Extend the SEO `index.php` path to read from MySQL (instead of InstantDB admin API).
- [ ] Remove `@instantdb/*` deps, the init block in `src/data/db.ts`, subscriptions, and Instant config. Archive `instant.schema.ts` / `instant.perms.ts` as reference.

---

## 5. No-realtime data updates from the frontend (periodic sync)

Without Instant's subscriptions, each client only sees what it fetches. For a low-frequency, multi-user app like this, **periodic sync + optimistic local writes + refetch-on-focus** is the standard and sufficient pattern.

### What actually updates the screen
1. **Optimistic updates for your own writes** — apply the change locally *immediately*, then fire the mutation; on failure, roll back and refetch. Instant's UX already does this; we keep it. This is the most important piece — it makes the app feel instant without any sync.
2. **Refetch on navigation & window focus** — whenever you open/refresh a trip, or the tab regains focus, pull fresh data. `visibilitychange` + `focus` listeners cover the "coworker edited this while I was away" case cheaply.
3. **Periodic lightweight polling** — a `GET /api/sync?since=<cursor>` endpoint returns only rows `updated_at > cursor` for the trips/resources the client cares about. Poll every 30–60s (or on a quiet timer). The client merges these deltas into its store.

### The sync endpoint
- Add a lightweight **cursor table / fields**: each table has `updated_at` (already in the schema); expose a single endpoint that, given a client-supplied `since` cursor (a millisecond timestamp) and a scope (e.g. `trip_id`), returns arrays of `{entity, id, updatedAt, op}` for changed rows, plus `data` so the client can merge.
- Keep it cheap: index `updated_at`, scope by trip, and batch by a `LIMIT`. On shared hosting you don't want a heavy query every poll.
- Eloquent makes this trivial: `Trip::where('updated_at', '>', $since)->where('trip_id',…)->...`; `deleted_at` soft-deletes let you emit `op: 'delete'` for removed rows.
- WebSockets/SSE are **not needed** — the poll cadence (30–60s) plus focus-refetch gives adequate freshness for trip planning data, and it scales on shared hosting.

### Recommended default
> **Own-write = optimistic; everything else = focus/navigation refetch + 30–60s incremental poll.** This is battle-tested for exactly this kind of collaborative-but-not-live data, and it's trivial on shared hosting. Revisit only if users demand sub-second cross-device sync (which would push you to a VPS + WebSockets).

---

## 6. Data migration path — Instant backup → MySQL

### Step 1 — Download a backup
```sh
npx instant-cli@latest backup list
npx instant-cli@latest backup download --latest     # zip
```
Layout:
```
instant-backup-<ts>.zip
├── config.json        # schema, rules, entity counts
├── entities/          # one .jsonl file per table with data
│   ├── $users.jsonl
│   ├── $files.jsonl   # not used here (no $files uploads in the code)
│   ├── trip.jsonl
│   └── … all tables
└── files/             # raw blobs (no app uploads, so we ignore these)
```

### Step 2 — Insert in parent-first (topological) order
FK children must come after their parents:

1. `users` (and write `auth_namespace_id` from the `$users` / `user$$users` link)
2. `trips`
3. `trip_user` (joins trip + user with `role`)
4. `activities`, `accommodations`, `macroplans`, `expenses` (FK → `trips`)
5. `task_lists`, then `tasks`
6. `comment_groups`, then `comment_group_object` (needs the target object row to exist), then `comments`

Each JSONL line has this shape:
```json
{"entity":{"id":"<id>","createdAt":…,…fields…},"createdAt":…}
```
- Read the `entity` map; each Instant *has-one* field (e.g. an `activity`'s link back to its `trip`) becomes a `trip_id` FK on the row.
- *Has-many* fields appear as arrays of ids (used by `commentGroupObject` N:N) — expand into join rows or `object_id`.

Where to run the import: do it **locally** (a small PHP or Node script reading the `.jsonl` → PDO inserts) into a staging MySQL, then import the staging dump into the shared host. Or run the script directly on the host if shell access exists.

### Step 3 — Watch for traps
- **IDs stay string-based** — no renumbering.
- `user.lastLoginAt` is declared `i.date()` in the schema (a date string), not an ms int — cast that column once in the importer.
- **Guest users** have no email but are still `users` rows. Every `$users` row with a `linkedPrimaryUser` link maps to a `users` row — preserve it. In the end, every guest needs a `sessions` row (or a passwordless login) — Phase 2.
- **Optional/absent fields** map to MySQL `NULL` exactly as Instant's `optional()`.

### Step 4 — Verify
- Compare imported row counts against `config.json` entity counts per table.
- Debug a full trip detail (`GET /trips/{id}` + nested children), the public directory, comments, and task ordering.
- Spot-check a few entity IDs against the running product.

### Step 5 — Live import + freeze
Follow Phase 4. Take the final backup right after the write freeze, import it, then switch the client. Hosting's weekly MySQL dumps cover backups going forward (no custom backup work).

---

## 7. Steps & migration checklist (codebase map)

| Area | Current file(s) | In Laravel / MySQL |
|------|-----------------|------------------|
| Schema / model | `instant.schema.ts` | Eloquent migrations + models |
| Auth / guest-link / recovery | `src/Auth/*`, `src/User/*`, `src/Auth/store.ts` | Laravel auth (sessions), reset flow, guest tokens |
| Queries / mutations | `src/data/db.ts`, `src/*/db.ts`, `data/store.ts` | Laravel API routes + Eloquent controllers |
| Permissions / roles | `instant.perms.ts` (per-entity owner/editor/viewer) | Laravel Policies / middleware (mirror perms) |
| Trip read-back (status, sharing, section visibility) | `src/Trip/getTripStatus.ts`, `sectionVisibility.ts`, `tripSharingLevel.ts` | Frontend-only (unchanged) or serializer helpers |
| SEO/metadata PHP glue | `feat/php-metadata-service` `index.php` | Keep; repoint from InstantDB admin API → MySQL |

---

## 8. Effort / risk / sequencing

| Area | Relative risk | Notes |
|---|---|---|
| Auth cutover (guests + email + recovery) | **High** | The main work now that realtime is gone. |
| Permissions parity (`instant.perms.ts`) | Medium | Lots of role-edge cases; needs tests. |
| Frontend store rewrite (subscribe → fetch) | Medium | Mechanical but touches many `db.ts`/store files. |
| Polymorphic comments (`commentGroupObject`) | Medium | One-off schema choice. |
| Atomic transactions (`dbAddTrip`, `dbDeleteTrip`) | Low | Straightforward with DB transactions. |
| ID / timestamp types (strings, ms) | Low | Preserve; don't "normalize" away. |
| ~~Realtime~~ | ~~Removed~~ | No realtime required — fetch-on-load only. |
| Backups | **None** | Hosting does weekly MySQL dumps. |

**Bottom line:** the data layer is the easy, mechanical part. With realtime dropped, the two things to budget for are **(a) auth (email + guest + password recovery)** and **(b) the store rewrite from live subscriptions to fetch-on-load + periodic sync.** Both are well-understood. The strangler-fig sequencing (read track first via a mirror, then the write track, then freeze) keeps each phase independently verifiable and rolling back to Instant safe until the final cutover.

---

## 9. Decisions vs. open questions (resolved)

| Question | Outcome |
|---|---|
| Framework / ORM? | **Laravel + Eloquent + Sanctum** (SSH + Composer available). JSON API under `/api/*`; React stays the SPA. |
| Keep guest accounts? | **Yes** — required. Passwordless session cookies; guest can upgrade to email+password later. |
| Password recovery UX? | **Yes** — required. One-time `reset_token` emailed, set-new-password flow. |
| Realtime needed? | **No** — optimistic local writes + periodic 30–60s sync + refetch on focus/navigation. |
| Gradual migration approach? | **Strangler-fig**: read track to MySQL first (mirror), then write track, then freeze. |
| Hosting / VPS? | **Shared hosting, no VPS.** Laravel behind LiteSpeed; existing SEO `index.php` kept for SPA HTML/OG. |
| Backups? | **Hosting does weekly MySQL dumps** — no custom backup work. |

---

## 10. Learning Laravel + Eloquent (reference docs, architecture, gotchas)

If Laravel is new to you, here's a curated path from "what is this" to "I can build the API we need."

### The 2-minute mental model

Laravel is a **request-lifecycle framework**. Every HTTP request enters through one front controller (`public/index.php`), gets bootstrapped by an **Application Container** (the "service container"), then follows a pipeline:

```
public/index.php  →  bootstrap the app (Container)  →  Router  →  Middleware  →  Controller  →  Response
```

Think of it as: **Router** decides *who* handles the URL. **Middleware** runs auth/CSRF/validation *before* the controller. **Controllers** are thin — they parse the request, call a **Model** or service, and return a **Response** (for us, JSON). **Eloquent models** wrap DB rows and relationships. **Views/Blade** render HTML (we mostly won't use these — we're a JSON API).

### Reading order (official docs first)

1. **Quickstart / lifecycle** — the 30-second mental model
   - Installation & quickstart: https://laravel.com/docs/11.x/installation
   - Lifecycle (what happens on every request): https://laravel.com/docs/11.x/lifecycle
2. **Architecture core**
   - The service container / how the app boots: https://laravel.com/docs/11.x/container
   - Directory structure (what each folder does): https://laravel.com/docs/11.x/structure
   - Artisan (CLI: `migrations`, `artisan tinker`, `artisan make:model`, `artisan schedule:run`): https://laravel.com/docs/11.x/artisan
3. **HTTP routing & middlewares** (our main surface)
   - Routing: https://laravel.com/docs/11.x/routing
   - Controllers: https://laravel.com/docs/11.x/controllers
   - Middleware: https://laravel.com/docs/11.x/middleware
   - Requests / validation: https://laravel.com/docs/11.x/validation
   - Responses (how to return JSON): https://laravel.com/docs/11.x/responses
4. **The heart we actually use the most this week: Eloquent/ORM**
   - Database / query: https://laravel.com/docs/11.x/database
   - Eloquent 100% high-value docs — **start here**: https://laravel.com/docs/11.x/eloquent
   - Relationships (the 1:1 / 1:N / N:N mapping to our graph): https://laravel.com/docs/11.x/eloquent-relationships
   - Pivot / many-to-many with extra columns (our `trip_user.role`): https://laravel.com/docs/11.x/eloquent-relationships#many-to-many
   - Migrations (schema, like our §3): https://laravel.com/docs/11.x/migrations
   - Query scopes & soft deleting: https://laravel.com/docs/11.x/eloquent#local-scopes and https://laravel.com/docs/11.x/eloquent-soft-deleting
5. **Auth** (we need sessions, guests, password reset)
   - Authentication (guard/Providers): https://laravel.com/docs/11.x/authentication
   - Password reset / forgot flow: https://laravel.com/docs/11.x/authentication#resetting-passwords
   - Sanctum (token + personal-access-token API auth): https://laravel.com/docs/11.x/sanctum
6. **Common glue we'll touch**
   - Config & env (our `config.php` → Laravel `.env`): https://laravel.com/docs/11.x/configuration
   - Caching (for the sync/serializer responses): https://laravel.com/docs/11.x/cache
   - Scheduling (periodic re-import / sync sweeps): https://laravel.com/docs/11.x/scheduling
   - Telemetry: https://laravel.com/docs/11.x/logging

### The Laravel "thinking model" in one paragraph

1. **It's MVC but service-driven.** The model (Eloquent) is a *layer*, not a giant class; put authorization in **middleware/Policies**, not scattered through controllers. Controllers stay thin; anything reusable (finding trips a user can see) lives in Eloquent scopes or a service class.
2. **Anything shared across requests lives in the Container** (bound as singletons). Laravel resolves dependencies by type-hint — a controller method `TripController(Database $db)` gets its dependency built automatically. That is "dependency injection," and it's why the whole framework feels "just works."
3. **Middleware = request gates.** `auth`, `throttle`, `validate`, CSRF, and our per-entity trip-permission checks all belong here, before any Controller code runs. This mirrors how `instant.perms.ts` gates views/uses in InstantDB today.
4. **The router is the API map.** You declare routes declaratively in `web.php`/`routes/api.php`; a missing/duplicate route is usually the first bug you'll hit.
5. **Artisan commands are the 2nd language.** "Generate a migration" (`php artisan make:migration`), "inspect" (`php artisan tinker`), "lint/route lists" — you spend more time in Artisan than in an IDE.

### Beginner guide — 20-minute "hello, JSON API"

1. Install locally: `composer create-project laravel/laravel ikuyo-api` then `php artisan serve`.
2. Create a route: in `routes/api.php`:
   ```php
   Route::get('/hello', fn () => response()->json(['message' => 'hi']));
   ```
   Visit `/api/hello`.
3. Create a model + migration:
   `php artisan make:model Trip -m` (the `-m` also creates a migration).
4. Fill the migration in `database/migrations/…_create_trips_table.php` (`$table->id()`, `->string('title')`, …), run `php artisan migrate`.
5. Query in the route: `Trip::where('id', $id)->first()`.
6. Add relationships: `Trip::belongsToMany(User::class)->withPivot('role')` — this is your `trip_user.role`.
7. Return JSON: `response()->json($trip->load('activities', 'accommodations'))`.
8. Wrap with auth middleware, add Sanctum, add a reset-token route. That is the whole backend.

### Gotchas you will hit on shared hosting / with this architecture

- **File permissions.** `storage/` and `bootstrap/cache/` must be writable for sessions/queue/cache. On cPanel run `php artisan config:cache` and check `storage/logs`. If the `storage/framework/views` dir isn't writable, you'll see odd 500s.
- **Don't `route:cache` API routes that use closures.** The APId route cache only supports controller-action routes, not closures. If you run `php artisan route:cache` while `routes/api.php` uses closures, you'll get "route not found" 404s. Use controller-action style for API routes, or skip `route:cache` for the API file.
- **Composer on the host.** Run `composer install --no-dev` to skip dev tooling, plus `--optimize-autoloader --prefer-dist`. After deploying to a different env, re-run `php artisan optimize` (clears config/lang/cache).
- **MySQL strict types vs Instant ms-Epoch.** We keep `BIGINT` ms columns. Beware Eloquent casts: if the DB column is already `BIGINT`, Eloquent returns an integer fine — don't add `datetime` casts on ms columns or they'll be mangled. Fields like `lastLoginAt` (a date string in Instant) are best handled with an Eloquent accessor, not a cast.
- **Eloquent relationship name collisions.** Our polymorphic `commentGroupObject` (`object_type` / `object_id`) needs `morphTo` (or a custom accessor / manual join), not a plain `belongsTo`. Map object_type→model explicitly.
- **Soft deletes are great for the sync endpoint.** `SoftDeletes` gives you `trashed()` and lets the sync endpoint emit `op:'delete'`. Enable it only where meaningful undo exists (e.g. trips, comment groups), not everywhere.
- **Avoid `ENUM` for role/type/sharing level.** Prefer `tinyint` + a PHP constant/lookup so you can extend values without a migration. Eloquent handles `tinyint` cleanly.
- **Timezones.** Store ms-epoch ints and tz strings as-is (no conversion to MySQL timezone types). Only the display layer formats; never convert in the model.
- **Env vs `config.php`.** Laravel reads `.env` (don't commit it); read secrets via `env()`. The existing `index.php` SEO service keeps its own `config.php` — keep the two config sources separate.

### Cheat-sheet quick links

- Eloquent relationships cheat: https://laravel.com/docs/11.x/eloquent-relationships
- Eloquent official docs (the full ORM guide): https://laravel.com/docs/11.x/eloquent
- Artisan commands reference: https://laravel.com/docs/11.x/artisan
- "Laravel from scratch" screencasts: search the official docs site for the "Introduction to Laravel" video series (Intro → Views → Controllers).
