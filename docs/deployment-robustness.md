# Robust production deployment runbook

This document describes the implemented single-copy deployment for the React
app, PHP metadata service, and Laravel API, followed by the ideal release-based
architecture. Shared-hosting disk constraints currently favor keeping the
existing rsync upload; a short maintenance window is acceptable for schema
changes.

## Current upload layout and its limits

The GitHub Actions build job copies the Laravel app into the frontend artifact:

```sh
cp -r backend dist/backend
```

`deploy.yml` invokes `scripts/deploy/deploy.sh`, which rsyncs `dist/` directly
into `DEPLOY_TARGET` after checking production migration state. The deployed
Laravel application is consequently at `DEPLOY_TARGET/backend`.

The rsync command uses `--delay-updates`, which reduces the chance of a partly
uploaded file being served, but it is not a complete release switch. The migration
path now blocks API traffic before upload until the schema is updated and the
app is verified. Ordinary uploads still serve traffic during file replacement.

The root `.gitignore` pattern `.env` is passed to rsync with
`--exclude-from=.gitignore`. Because it is a basename pattern, it excludes
`backend/.env` too. The production environment file is therefore preserved by
the current deployment. The deployment additionally excludes
`backend/storage/`, generated
`backend/bootstrap/cache/*.php`, SQLite database files, and the host deployment
lock. These exclusions preserve runtime state and prevent CI-generated Laravel
caches from replacing production caches.

## Implemented plan: automatic uploads with a migration gate

There is one deployed copy. No release directories or previous build artifacts
are retained on the shared host. GitHub Actions retains build artifacts according
to its retention policy; those can be downloaded for deliberate code recovery.

### Automatic deployment

Every successful push build on `main` enters the serialized production deploy job:

1. Acquire `DEPLOY_TARGET/.ikuyo-deploy-lock` with an atomic `mkdir`. Refuse to
   proceed if another deployment owns it.
2. Compare the build SHA with the current GitHub `main` SHA. Skip a stale build,
   including an old workflow rerun; use a new run for latest `main` instead.
3. Build a manifest of **all migration filenames in the incoming artifact**.
   Stream `scripts/deploy/state.php` over SSH and bootstrap the deployed Laravel
   app to read its configured database's migration repository. Compare incoming
   names with completed names. This detects new files that the deployed code's
   `migrate:status` cannot see. No incoming app copy is uploaded for this check.
4. Also check maintenance mode and the persistent incomplete-deployment marker.
5. If there are pending migrations or recovery is needed, finish with a
   **Manual deployment required** job summary. Leave production untouched and
   release the host lock. This is a deliberately skipped deploy, not a failed
   test/build or an indefinitely waiting workflow approval.
6. Otherwise, mark the deployment incomplete and rsync directly into the existing
   target. Do not enter maintenance or run migrations on this path.
7. Clear caches, discover Composer packages, rebuild Laravel caches, query the
   database again, and confirm no incoming migrations remain pending.
8. Check the real, DB-backed `/api/trips/public` HTTP endpoint and require a
   successful JSON response. Remove the incomplete marker only after success.

A state-query failure fails the job before uploading or entering maintenance.
Ordinary in-place uploads still have a period where live PHP files are being
replaced, and rsync may fail midway; `--delay-updates` does not make the whole
release atomic. This is an accepted limit of the single-copy approach.

### Manual migration deployment and recovery

In GitHub Actions, select **Testing → Run workflow**, select **main**, and check
**Authorize migrations / recovery** (`allow_migrations`). This rebuilds and tests
latest `main`, then deploys it. A push cannot supply this authorization, even if
an input is accidentally passed to the reusable deploy workflow. No separate
GitHub environment reviewer configuration is required for this manual gate.

The manual run repeats the same host lock, latest-SHA, and production-state
checks. If migrations are pending or production is blocked, it:

1. Requires Laravel's file maintenance driver and synchronous queues. A worker
   deployment requires a separate drain/stop procedure before enabling this flow.
2. Runs `php artisan down --render="errors::503" --retry=60` on the current app.
3. Installs a small standalone `storage/framework/maintenance.php` handler that
   returns HTTP 503 JSON before loading Composer or Laravel. The framework's
   standard prerendered handler lets JSON requests fall through, so it is not
   sufficient while dependencies are being replaced. No bypass secret is used.
4. Waits `DEPLOY_DRAIN_SECONDS` for in-flight requests to finish. Configure this
   to exceed the host's maximum request duration; the default is 30 seconds.
5. Marks deployment incomplete and performs the same in-place rsync upload.
6. Clears caches, discovers packages, runs `php artisan migrate --force`, rebuilds
   caches, and checks the uploaded app can query the migration repository with no
   pending migrations.
7. Runs `php artisan up`, checks the DB-backed HTTP endpoint, and removes the
   incomplete marker. If this final check fails, re-enables maintenance.

A manual run with no pending migrations and no recovery state uses the ordinary
automatic upload path. The frontend may still load during API maintenance;
backend 503 responses enforce the write pause for already-open browsers.

Upload, migration, or verification failure does **not** unconditionally run
`artisan up`. The incomplete marker remains, and a migration deployment remains
in maintenance. A later automatic merge is blocked rather than bypassing recovery.
Use a fresh manual workflow run for a transient failure. A partially completed
migration, broken PHP bootstrap, or unavailable host may need SSH and deliberate
repair. This implementation does not promise unattended recovery or automatically
roll back a database migration.

### Later merges preserve the manual requirement

The gate is derived from production's actual database, not the latest commit's
diff and not a flag attached to one workflow run:

- Merge A adds a migration; its automatic deployment stops before any upload.
- Merge B changes only the UI, but its artifact includes A's migration. Since
  production has not applied it, B also requires a manual run.
- Manually deploy latest main to upload both changes and apply the migration.
- Subsequent builds deploy automatically once every incoming migration is applied.

Never edit an already-applied migration to change the schema. Add a new migration
file instead; Laravel tracks migration names, not content hashes. Removing a
pending migration from main removes that schema task from the incoming build;
review that as an intentional cancellation.

### Configuration and operational requirements

Keep the existing `production` GitHub environment and SSH secret:

- `DEPLOY_SSH_KEY`: existing deployment secret.
- `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_TARGET`: existing variables;
  the target must be an absolute directory path.
- **`DEPLOY_HEALTH_URL`**: required HTTPS URL ending in `/api/trips/public`, for
  example `https://your-domain.example/api/trips/public`. Do not use `/up` or a
  SPA route; the current web-server routing exposes Laravel through `/api/*`.
- `DEPLOY_DRAIN_SECONDS`: optional drain window, default `30`.

The `production` environment must allow automatic jobs if ordinary merges are
intended to deploy without approval. Existing required reviewers would still gate
all jobs using that environment. The migration gate itself uses explicit manual
workflow dispatch, so there is no new environment to configure.

The deployed backend, dependencies, writable storage, and production `.env` must
already exist for the state check. First provisioning is a manual host setup.
Use `APP_MAINTENANCE_DRIVER=file` and `QUEUE_CONNECTION=sync` for migration runs.
PHP, Bash, and `/dev/stdin` must be available over SSH. Do not bundle a production
SQLite database into the artifact.

GitHub deployment concurrency uses one production group with
`cancel-in-progress: false`. A newer build cannot cancel an active upload or
migration. The host lock also covers check, upload, migration, and verification;
any separate manual host deploy must honor it. GitHub may replace an older
pending job with a newer one; the SHA check ensures stale builds are skipped.

The script releases its lock on normal exit and catchable interruption. A
force-killed runner or lost host can leave a stale lock. Only after confirming no
deployment is active, remove `DEPLOY_TARGET/.ikuyo-deploy-lock` over SSH and run
latest main manually. Do not delete the lock while an upload is running.

Before destructive migrations, verify a database backup outside the host's
limited web storage and be available to intervene. Manual authorization grants
permission to migrate; it does not create or verify a backup. Normal no-migration
uploads can also fail and leave partial code, but the marker prevents subsequent
automatic uploads from treating that state as healthy. Retrying latest main via
the manual workflow can recover if the deployed Laravel bootstrap still works.

## Ideal deployment goals

1. Never deploy a partial release to live traffic.
2. Keep database schema and application code compatible during normal deploys.
3. Require an explicit, auditable maintenance window for breaking migrations.
4. Serialize deployments and schema changes.
5. Make rollback fast for code, and deliberate for data.
6. Keep production secrets and mutable runtime files outside build artifacts.

## Ideal release layout (future option)

Configure the web server document root to a stable `current` symlink, rather
than a directory rsync overwrites in place. The exact paths are host-specific;
the following is an example:

```text
/home/account/ikuyo/
  current -> releases/<git-sha>
  releases/
    <git-sha>/                 # immutable uploaded build artifact
  shared/
    backend/.env               # production-only Laravel configuration
    backend/storage/           # Laravel logs, sessions, cache, uploads
    backups/                   # database dumps, outside the web root
```

Each release contains the current `dist/` layout, including `backend/`. Before
switching `current`, link the persistent files into the release:

```sh
ln -sfn ../../shared/backend/.env releases/$SHA/backend/.env
rm -rf releases/$SHA/backend/storage
ln -sfn ../../shared/backend/storage releases/$SHA/backend/storage
```

Keep `bootstrap/cache/` writable if Laravel requires it. Confirm that the host
allows the document root to follow the `current` symlink; otherwise use the
host's equivalent atomic release mechanism.

Do **not** put `.env`, database dumps, user uploads, logs, sessions, or a
SQLite production database in the build artifact.

## Normal schema change: expand, migrate, use, contract

Most production migrations should be backward compatible:

1. **Expand**: add a nullable column, new table, index, or additive relation.
   Do not remove/rename a column or immediately require the new field.
2. Upload the release to `releases/$SHA`; do not switch `current` yet.
3. Run `php artisan migrate --force` from that release.
4. Health-check the currently live application and the new release.
5. Atomically switch `current` to the new release.
6. **Backfill** large data in a separately monitored, resumable Artisan command.
7. **Contract**: only after old code is no longer deployed and the backfill is
   complete, remove obsolete reads/writes and make a later migration to remove
   old columns/tables.

Because the old release remains live while step 3 runs, its code must work with
the expanded schema. Because the new release is deployed after step 3, it must
also tolerate the pre-backfill state.

Examples that generally fit the normal path:

- Add a nullable column or a new table.
- Add an index using an online/low-lock method supported by the production MySQL
  version.
- Add a feature guarded by application code until data is backfilled.

## Breaking migration: controlled maintenance deployment

A column rename/drop, incompatible type change, destructive transform, or a
long table lock is not a zero-downtime migration. Use a deliberate maintenance
window:

1. Announce the window and make a verified database backup.
2. Enforce read-only/maintenance mode **on the backend**. The frontend
   `IKUYO_READ_ONLY_MODE` flag is helpful UX, but old browser bundles may remain
   open, so it is not sufficient protection by itself.
3. Drain or stop queue workers if they can write affected data.
4. Upload the release, run the migration, and run any required data transform.
5. Run database checks and API health checks.
6. Switch `current` to the new release.
7. Re-enable backend writes and monitor errors/latency.

Use `php artisan down` only when its maintenance state is stored in shared
Laravel storage and is confirmed to affect the live release. A server-level
maintenance rule is safer on shared hosting.

## Ideal GitHub Actions design

Keep frontend build/test and deployment separate, but make deployment a single
serialized production workflow. The existing `environment: production` can
require a manual approval for breaking changes.

Recommended deploy job sequence:

```text
1. Download tested build artifact.
2. Acquire a host deployment lock.
3. Upload artifact to releases/$GITHUB_SHA.
4. Link shared .env and storage into that release.
5. Run migration status/checks.
6. Run migrations from the release.
7. Atomically update current -> releases/$GITHUB_SHA.
8. Clear/rebuild Laravel caches as appropriate.
9. Check /up and a frontend/API smoke endpoint.
10. Retain the previous release; prune only older releases.
```

The host-side portion should use a lock as GitHub's workflow concurrency alone
does not protect against a manual SSH deploy. For example:

```sh
flock -n /home/account/ikuyo/deploy.lock sh -ceu '
  RELEASE=/home/account/ikuyo/releases/$GITHUB_SHA
  BACKEND="$RELEASE/backend"

  cd "$BACKEND"
  php artisan migrate:status
  php artisan migrate --force
  php artisan optimize:clear

  ln -sfn "$RELEASE" /home/account/ikuyo/current
  curl --fail --silent --show-error https://example.invalid/up >/dev/null
'
```

Use `php artisan migrate --isolated --force` only when Laravel's configured
cache driver provides a shared lock appropriate for the production host. The
host `flock` remains useful regardless.

CI should additionally:

- run `php artisan migrate --pretend --force` against a production-like MySQL
  staging database when migrations change;
- run the full migration sequence on a fresh staging database;
- test the migration against a copy or representative size of production data
  for expensive changes;
- package production dependencies deliberately (`composer install --no-dev
  --prefer-dist --optimize-autoloader`) if `vendor/` remains part of the
  artifact.

## Database backup and rollback

Before every production schema migration, create and verify a MySQL backup, for
example:

```sh
mysqldump --single-transaction --routines --events --databases "$DB_DATABASE" \
  > /home/account/ikuyo/shared/backups/pre-$GITHUB_SHA.sql
```

Store backups outside the web root, encrypt them where required, and regularly
prove that they can be restored.

Code rollback is normally an atomic symlink change back to the prior release:

```sh
ln -sfn /home/account/ikuyo/releases/$PREVIOUS_SHA /home/account/ikuyo/current
```

Do not automatically run `php artisan migrate:rollback` during rollback.
Migrations may be irreversible, may have been followed by a data backfill, or
may conflict with data written by the new release. For a failed destructive
migration, keep maintenance enabled, restore the verified database backup, then
switch code back after confirming the schema and data state.

## Operational checks

Before declaring a deployment complete, record:

- release SHA and migration batch from `php artisan migrate:status`;
- successful `/up` response;
- one unauthenticated public API request and one authenticated smoke test;
- Laravel log/error-rate check;
- MySQL lock/slow-query check for schema-heavy migrations;
- backup location and restore verification status for breaking changes.

## When to move toward the ideal layout

The implemented migration gate and controlled downtime fit current shared-hosting
constraints. Release directories remain the preferred future option when disk
capacity permits: they avoid partial live-code uploads and allow fast code
rollback. Until then, accept that failed in-place uploads may need manual recovery,
and schedule breaking schema changes only when intervention is possible.
