# Trip archival plan

## Goal

Let an owner archive a trip without deleting its data. An archived trip
preserves its existing visibility and remains viewable to everyone who could
previously view it. Its content becomes read-only until the owner unarchives
it. Archival is an explicit state; it is not inferred from the trip end date.

## Proposed lifecycle

1. Add nullable `archived_at_ms` to `trips` and expose it as
   `archivedAt` in the trip-list and full-trip API payloads. `null` means
   active; a millisecond timestamp records when the trip was archived.
2. Add an owner-only, idempotent archive mutation. It sets `archived_at_ms`
   and updates `updated_at_ms`. The matching unarchive mutation clears it.
3. Treat archival as a server-enforced content write lock. The read APIs,
   direct trip URL, exports, print, and duplicate remain available. Content
   mutations return a clear `409 Conflict` when archived, but owners may still
   change sharing and membership or delete the trip.
4. Put archiving and unarchiving in the owner section of the trip menu. Both
   actions use a confirmation dialog; the archive dialog explains that the
   trip content will become read-only. While archived, hide or disable content
   editing controls and show a persistent “Archived — content is read-only”
   banner. Keep owner sharing and delete actions available.
5. Exclude archived trips from the normal active/past list requests. Add an
   explicit archive entry point that loads a paginated archived list, ordered
   by `archived_at_ms` descending. Opening an archived trip works exactly as
   opening any other trip.
6. On unarchive, clear the archive timestamp, refresh the open trip and trip
   lists, remove the read-only banner, and return the trip to its existing
   active/past grouping (which is still based on the end date).

## Backend work

- Create a migration for `trips.archived_at_ms`, with an index suitable for
  member-scoped archive retrieval. Add the field to `Trip` casts and response
  serializers.
- Extend `GET /api/trips` with an archive filter. Preserve today's `active`
  and `past` meanings for non-archived trips; use `status=archived` for the
  archive view and cursor pagination.
- Add a dedicated owner-only archive state endpoint, for example
  `PATCH /api/trips/{trip}/archive` with `{ "archived": true|false }`.
  Validate state transitions server-side and make repeat requests safe.
- Centralize the content write-lock check in `TripAccessService` (or dedicated
  middleware). Apply it to trip metadata updates and all child-entity, task,
  comment, batch, drag, and direct-ID content routes. Do not apply it to
  sharing, member management, deletion, or the archive-state endpoint, and do
  not rely on frontend disabled controls.

## Frontend work

- Extend trip types, API mappers, and store state with `archivedAt`.
- Split the existing trip fetches into normal active/past and an on-demand
  archived query. Keep archive pagination independent from past-trip “load
  more”.
- Add an Archived Trips entry from the trips screen, empty/loading/error
  states, and a way back to the normal list.
- Add archive/unarchive controls and confirmation dialogs for owners only.
  Ensure a loaded archived trip makes every content-edit control consistently
  unavailable, including keyboard/secondary entry points, while retaining
  owner sharing and deletion controls.
- Show the archived status in cards and the trip header so a direct link does
  not look editable before the menu is opened.

## Verification

- Migration and API tests: an owner can archive/unarchive; editors/viewers
  cannot; repeated requests are safe; `archivedAt` is serialized correctly.
- List tests: archived trips are absent from active/past, returned only by the
  archived query, pagination remains stable, and unarchive restores normal
  grouping.
- Authorization matrix tests: all content, task, comment, direct-ID, and bulk
  mutations are rejected for archived trips; owner sharing, member management,
  and deletion remain permitted; reads, print/export, and duplication continue
  to work.
- UI tests: owner controls, confirmation, read-only banner, archive retrieval,
  and unarchive refresh behavior.

## Confirmed behavior

- Only owners may archive or unarchive. Editors and viewers retain their
  existing read, print, export, and duplicate permissions.
- Archival preserves the trip's existing private/shared/public visibility.
- Archival may occur at any time.
- Archived trips are retrieved from a separate Archived Trips page linked from
  the normal trips page. This page has one chronological list rather than
  upcoming/ongoing/past groups.
- Archival locks every content mutation, including trip metadata, comments,
  tasks, and expenses. Owner sharing changes, member additions/removals, and
  trip deletion remain allowed.
- A future policy may require archiving before deletion; it is explicitly out
  of scope for this change.
