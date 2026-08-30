# Trip archival plan

## Goal

Let an owner archive a completed trip without deleting its data. An archived
trip remains viewable to everyone who could previously view it, but no trip
data can be changed until the owner unarchives it. Archival is an explicit
state; it is not inferred from the trip end date.

## Proposed lifecycle

1. Add nullable `archived_at_ms` to `trips` and expose it as
   `archivedAt` in the trip-list and full-trip API payloads. `null` means
   active; a millisecond timestamp records when the trip was archived.
2. Add an owner-only, idempotent archive mutation. It sets `archived_at_ms`
   and updates `updated_at_ms`. The matching unarchive mutation clears it.
3. Treat archival as a server-enforced trip-wide write lock. The read APIs,
   direct trip URL, exports, print, and duplicate remain available. Every
   mutation of the trip graph returns a clear `409 Conflict` when archived.
4. Put archiving and unarchiving in the owner section of the trip menu. Both
   actions use a confirmation dialog; the archive dialog explains that the
   trip will become read-only. While archived, hide or disable all edit and
   destructive controls and show a persistent “Archived — read-only” banner.
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
- Centralize the write-lock check in `TripAccessService` (or dedicated
  middleware) and apply it to every mutation. This must cover trip updates,
  sharing, members, all child entities, task lists/tasks, comments, batch and
  drag operations, and the current direct-ID write routes. Do not rely on
  frontend disabled controls.
- Decide and document the treatment of mutations that change access rather
  than content (sharing, members, and deletion); see decision points below.

## Frontend work

- Extend trip types, API mappers, and store state with `archivedAt`.
- Split the existing trip fetches into normal active/past and an on-demand
  archived query. Keep archive pagination independent from past-trip “load
  more”.
- Add an Archived Trips entry from the trips screen, empty/loading/error
  states, and a way back to the normal list.
- Add archive/unarchive controls and confirmation dialogs for owners only.
  Ensure a loaded archived trip makes all edit controls consistently
  unavailable, including keyboard/secondary entry points.
- Show the archived status in cards and the trip header so a direct link does
  not look editable before the menu is opened.

## Verification

- Migration and API tests: an owner can archive/unarchive; editors/viewers
  cannot; repeated requests are safe; `archivedAt` is serialized correctly.
- List tests: archived trips are absent from active/past, returned only by the
  archived query, pagination remains stable, and unarchive restores normal
  grouping.
- Authorization matrix tests: every content, task, comment, member, sharing,
  direct-ID, and bulk mutation is rejected for archived trips, while permitted
  reads, print/export, and duplication continue to work.
- UI tests: owner controls, confirmation, read-only banner, archive retrieval,
  and unarchive refresh behavior.

## Decisions needed

1. **Who may archive/unarchive?** Proposed: owners only. Editors and viewers
   can still view, print, export, and duplicate according to existing access.
2. **Visibility after archival:** should public/shared visibility be preserved,
   or should archive automatically make the trip private/unlisted?
3. **What exactly is locked?** Proposed: all mutations, including sharing,
   membership, and deletion; only unarchive is allowed. An alternative is to
   let owners still change sharing/members or delete while the content remains
   locked.
4. **Where is it retrieved?** Proposed: remove it from the default list and
   provide a dedicated, on-demand “Archived trips” view. An alternative is a
   collapsed Archived section at the end of the normal trips page.
5. **When is it eligible?** Proposed: any owner can archive at any time. An
   alternative is only after the trip end date has passed.
6. **Are any writes exempt?** Proposed: no. In particular, comments and task
   completion are read-only too. An alternative is to permit post-trip expense
   reconciliation and/or comments.
