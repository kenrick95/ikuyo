# Robust production deployment runbook

This document describes how to evolve Ikuyo's current deployment into a safe,
repeatable deployment process for the React app, PHP metadata service, and
Laravel API.

## Current deployment and its risks

The GitHub Actions build job copies the Laravel app into the frontend artifact:

```sh
cp -r backend dist/backend
```

`deploy.yml` then rsyncs `dist/` directly into `DEPLOY_TARGET`. The deployed
Laravel application is consequently at `DEPLOY_TARGET/backend`.

The rsync command uses `--delay-updates`, which reduces the chance of a partly
uploaded file being served, but it is not a complete release switch. In
particular, a schema migration run after rsync can leave a period where newly
uploaded PHP code expects a schema that does not yet exist.

The root `.gitignore` pattern `.env` is passed to rsync with
`--exclude-from=.gitignore`. Because it is a basename pattern, it excludes
`backend/.env` too. The production environment file is therefore preserved by
the current deployment. Other runtime data must be considered separately.

## Deployment goals

1. Never deploy a partial release to live traffic.
2. Keep database schema and application code compatible during normal deploys.
3. Require an explicit, auditable maintenance window for breaking migrations.
4. Serialize deployments and schema changes.
5. Make rollback fast for code, and deliberate for data.
6. Keep production secrets and mutable runtime files outside build artifacts.

## Recommended release layout

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

## GitHub Actions design

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

## Immediate incremental improvement

Before implementing release directories, add a post-rsync SSH migration step to
the existing deployment workflow. This is acceptable only for additive,
backward-compatible migrations and should run:

```sh
cd "$DEPLOY_TARGET/backend"
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
```

Follow it with `/up` health checking. Release directories and atomic symlink
switching should be completed before relying on automatic deployment of
breaking schema changes.
