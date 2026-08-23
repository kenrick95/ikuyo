# Remaining Backend Migration Plan

This plan covers the work still required before the InstantDB → Laravel/MySQL cutover.
InstantDB is intentionally retained until the final verification period.

## ✅ 1. Durable sync events and delete tombstones

**Goal:** Make periodic sync converge after updates, membership changes, and hard deletes.

**Status:** Implemented in `backend/app/Models/SyncEvent.php`, `SyncEventService`,
`SyncableObserver`, and `GET /api/sync`. Delete-tombstone regression coverage exists.

Implementation:

1. Add `sync_events` table with:
   - monotonic numeric `id`
   - `entity`
   - `entity_id`
   - `operation` (`upsert`/`delete`)
   - `trip_id` nullable
   - JSON payload nullable
   - created timestamp
2. Record an event in the same DB transaction as every Laravel create/update/delete.
3. Change `/api/sync` to paginate by `sync_events.id`, not independent table timestamps.
4. Filter events by `trip_id` and authorization.
5. Return delete tombstones with `op: delete` and no payload.
6. Keep a retention policy; weekly MySQL backups remain the recovery mechanism.

## ✅ 2. Full API contract and authorization matrix

Implemented core serializer normalization and contract tests. Continue expanding the
matrix during staging.

1. Create API Resources/serializers for each frontend entity.
2. Ensure snake_case DB fields become the exact existing camelCase Zustand shape.
3. Add contract tests for the complete trip graph.
4. Test anonymous, viewer, editor, and owner access for every endpoint.
5. Test cross-trip IDs and hidden section flags.

## 3. Real MySQL staging validation

On the shared host:

1. Deploy Laravel with Composer and PHP 8.4.
2. Create an empty staging MySQL database.
3. Run migrations.
4. Run the real Instant backup importer with `--dry-run --verify-config --json`.
5. Import the backup.
6. Compare counts and sample IDs.
7. Run the backend tests against MySQL.

## 4. SEO front-controller cutover

1. Keep the existing root `index.php` and `app/` SEO code.
2. Replace its InstantDB Admin API metadata lookup with a Laravel metadata HTTP request.
3. Preserve public-only behavior and `Cache-Control: no-store`.
4. Test public, private, missing, and malformed trip IDs.
5. Do not expose Instant admin credentials after cutover.

## 5. Complete frontend staging rollout

Enable flags one at a time:

1. `IKUYO_BACKEND_TRIP_READS=true`
2. `IKUYO_BACKEND_AUTH=true`
3. `IKUYO_BACKEND_TRIP_WRITES=true`
4. `IKUYO_BACKEND_ACTIVITY_WRITES=true`
5. `IKUYO_BACKEND_CONTENT_WRITES=true`
6. `IKUYO_BACKEND_TASK_WRITES=true`
7. `IKUYO_BACKEND_SHARING_WRITES=true`

After each flag, test the relevant UI and retain the previous fallback.

## 6. Production cutover

1. Enable application read-only mode.
2. Put InstantDB into read-only mode.
3. Take the final Instant backup.
4. Import it into production MySQL.
5. Verify row counts and key relationships.
6. Deploy the frontend with all backend flags enabled.
7. Verify auth, public sharing, CRUD, comments, tasks, sync, and SEO.
8. Keep InstantDB and code available for rollback.

## 7. Decommission

Only after a stable verification period:

1. Remove InstantDB frontend dependencies and initialization.
2. Remove InstantDB environment variables.
3. Archive `instant.schema.ts` and `instant.perms.ts`.
4. Remove old Instant-specific fallback code.
5. Retain MySQL backups according to hosting/retention policy.
