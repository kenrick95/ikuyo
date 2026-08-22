# Ikuyo! Backend API — Endpoint Specification (from the React frontend)

> This is the **complete list of endpoints the current React app needs**, derived by
> reading every `db.*` call in `src/`. The PHP/Laravel backend must implement these
> (plus auth) to replace InstantDB with zero frontend rewrite.
>
> **Auth model for the API:** the current app's `subscribeAuth` gives the frontend an
> `authUser` (the `$users` namespace id) and the linked `user` record. In the new
> backend the session (cookie or bearer token) *is* the identity; every endpoint below
> that says "current user" resolves the session to the `users.id`.
>
> **Notation:** `→` means "the endpoint must return this". All writes are JSON body.

---

## 0. Conventions

- **IDs** are the string UUIDs from Instant (`VARCHAR(40)`); the backend must accept
  and return them unchanged.
- **Timestamps** are unix **ms epoch** ints everywhere (`BIGINT`), except
  `lastLoginAt` which Instant stores as a date string (see `instant.schema.ts`).
- **Permission model** mirrors `instant.perms.ts`:
  - trip visible ⇔ `sharingLevel >= 2` (public) **or** user is a member (`trip_user`).
  - section visibility ⇔ `publicShowX`/`viewerShowX` toggles (undefined ⇒ visible).
  - mutations require `owner` (delete, sharing, tripUser) or `editor|owner` (content).
- Frontend "stores" fetch on load (no realtime); the API is fetch/CRUD. A
  `GET /api/sync` endpoint (see §5 of the migration plan) is optional but recommended.

---

## 1. Auth

| Method | Path | Purpose | Body / Notes | Response |
|---|---|---|---|---|
| POST | `/api/auth/forgot` | send password-reset email | `{email}` | `{ok:true}` (always, to avoid user enumeration) |
| POST | `/api/auth/reset` | set new password | `{resetToken, password}` | `{ok:true}` |
| POST | `/api/auth/login` | password login (email users) | `{email, password}` | sets session; `{user}` |
| POST | `/api/auth/logout` | destroy session | — | `{ok:true}` |
| POST | `/api/auth/guest` | create/continue guest session | — | creates `users` row w/o email + session; `{user}` |
| POST | `/api/auth/upgrade` | guest → email+password | `{email, password}` | links email to guest user (mirror `dbCreateUser`/`dbUpdateUser` + `src/Auth/store.ts` upgrade path) |
| GET | `/api/auth/me` | current user (session) | — | `{user}` or `null` |

> Covers: `db.auth.sendMagicCode`, `db.auth.signInWithMagicCode`,
> `db.auth.createAuthorizationURL` (OAuth — replace with password login + reset),
> `db.auth.signOut`, `dbCreateUser`, `dbUpdateUser` (activated/link paths).

---

## 2. Read endpoints (fetch on load)

### 2.1 `GET /api/trips` — "my trips"
- Query params: `?now=<ms>` (server-side grouping uses the client's "now").
- **Response:** all trips where the current user is a member, each as:
  ```json
  { "id", "title", "timestampStart", "timestampEnd", "timeZone",
    "createdAt", "lastUpdatedAt" }
  ```
- **Split:** the frontend splits into *active* (`timestampEnd >= now`) and *past*
  (`timestampEnd < now`, paginated). Implement either as one endpoint returning all
  with a `timestampEnd` filter, or two:
  - `GET /api/trips?status=active|past&now=<ms>&limit=10&cursor=...`

> Covers: `src/Trips/store.ts` `subscribeQuery` + `subscribeInfiniteQuery`
> (`where: {'tripUser.user.id': currentUserId, timestampEnd: {$gte|$lt: now}}`,
> order `timestampEnd desc`, limit 10). `getTripsGrouped` (upcoming/ongoing/past)
> then groups client-side.

### 2.2 `GET /api/trips/public` — public directory
- Query params: `?limit=12&cursor=...`
- **Response:** paginated list of trips with `sharingLevel == 3` **and** at least one
  activity, ordered `createdAt desc`:
  ```json
  [ { "id", "title", "timestampStart", "timestampEnd", "timeZone",
      "createdAt", "ownerHandle", "activityCount" } ]
  ```
  (`ownerHandle` = the `owner` tripUser's user.handle; `activityCount` = count.)
- **Cursor:** must support `loadNextPage` (InfiniteQuery).

> Covers: `src/TripsPublic/store.ts` `subscribeInfiniteQuery` (limit 12,
> `where: {sharingLevel: 3, 'activity.id': { $isNull: false }}`, order
> `serverCreatedAt desc`, nested `tripUser(user)` + `activity`).

### 2.3 `GET /api/trips/{tripId}` — full trip detail (the big one)
- **Response:** the complete trip graph, shaped exactly like the store's
  `subscribeTrip` query:
  ```json
  {
    "id", "title", "timestampStart", "timestampEnd", "timeZone",
    "region", "currency", "originCurrency", "originRegion", "originTimeZone",
    "sharingLevel", "createdAt", "lastUpdatedAt",
    "publicShowExpenses", "publicShowTasks", "publicShowComments",
    "viewerShowExpenses", "viewerShowTasks", "viewerShowComments",
    "activities":   [ { "id","title","location","locationLat","locationLng",
        "locationDestination","locationDestinationLat","locationDestinationLng",
        "locationZoom","locationDestinationZoom","description",
        "timestampStart","timestampEnd","timeZoneStart","timeZoneEnd",
        "createdAt","lastUpdatedAt","flags","icon" } ],
    "accommodations":[ { "id","name","address","phoneNumber","notes",
        "timestampCheckIn","timestampCheckOut","timeZoneCheckIn","timeZoneCheckOut",
        "locationLat","locationLng","locationZoom","createdAt","lastUpdatedAt" } ],
    "macroplans":    [ { "id","name","notes","timestampStart","timestampEnd",
        "timeZoneStart","timeZoneEnd","createdAt","lastUpdatedAt" } ],
    "expenses":      [ { "id","title","description","amount","amountInOriginCurrency",
        "currency","currencyConversionFactor","timestampIncurred","timeZoneIncurred",
        "createdAt","lastUpdatedAt" } ],
    "taskLists":     [ { "id","title","index","status","createdAt","lastUpdatedAt",
        "tasks": [ { "id","title","description","index","status","dueAt",
                      "completedAt","createdAt","lastUpdatedAt" } ] } ],
    "tripUsers":     [ { "id","role","createdAt","lastUpdatedAt",
        "user": { "id","handle","activated","email" } } ],
    "commentGroups": [ { "id","status","createdAt","lastUpdatedAt",
        "comments": [ { "id","content","createdAt","lastUpdatedAt",
                          "user": { "id","handle","activated" } } ],
        "object": { "id","type","createdAt","lastUpdatedAt",
                    "trip"|"activity"|"accommodation"|"expense"|"macroplan"|"task":
                      { "id","title"|"name" } } } ]
  }
  ```
- **Permissions:** if trip is not public (`< 2`), 404/403 unless current user is a
  member. Respect `viewerShowX`/`publicShowX` when serializing `expenses`/
  `taskLists`/`commentGroups`.
- `tripUser.user` includes `email` only when the current user is a member (matches the
  current perms: `user` view is public but email fields are guarded by membership).

> Covers: `src/Trip/store/store.ts` `subscribeTrip` (limit 1, all child collections,
> nested `tripUser.user`, `commentGroup.comment.user`, `commentGroup.object` w/ target
> title). Also powers ICS export + print (client-side only) and `TripMenu`.

### 2.4 `GET /api/users/by-handle/{handle}` — resolve a user by handle
- **Response:** `{ "id", "handle", "activated" }` (no email).
- Used by sharing/mention UIs; also the target of `TripSharingDialog`.

> Covers: `generateUniqueHandle` (`queryOnce` by handle), handle uniqueness checks.

### 2.5 `GET /api/users/me` — current user profile
- **Response:** `{ "id","handle","email","activated","createdAt","lastUpdatedAt",
  "lastLoginAt","preferredRegion","preferredCurrency","preferredTimeZone" }`
- Powers `UserAvatarMenu`, `PageAccount`, preferences.

> Covers: `subscribeAuth` + the `subscribeQuery` on `user` in `src/Auth/store.ts`.

---

## 3. Write endpoints (mutations)

### Trips
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| POST | `/api/trips` | create trip + owner tripUser (atomic) | trip fields + `{userId}` | mirrors `dbAddTrip` (transaction: trip + tripUser role=owner linked) |
| PUT | `/api/trips/{tripId}` | update trip | all trip fields | mirrors `dbUpdateTrip` (`merge`) |
| DELETE | `/api/trips/{tripId}` | delete trip + all children (cascade) | — | mirrors `dbDeleteTrip` (activities, accommodations, macroplans, expenses, taskLists+tasks, commentGroups+comments+objects, tripUsers) |
| POST | `/api/trips/{tripId}/duplicate` | duplicate trip | `TripDuplicateOptions` | mirrors `dbDuplicateTrip`; server does date-shifting (`shiftTimestampToTripDate`) — see `duplicateTripDateShift.ts` |
| PATCH | `/api/trips/{tripId}/sharing` | set `sharingLevel` | `{sharingLevel}` | mirrors `dbUpdateTripSharingLevel` |
| PATCH | `/api/trips/{tripId}/sections` | set `publicShow*`/`viewerShow*` toggles | partial of those 6 booleans | mirrors `dbUpdateTripSectionVisibility` |

### tripUser (sharing)
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| POST | `/api/trips/{tripId}/members` | add user by email | `{userEmail, role}` | mirrors `dbAddUserToTrip` (creates user if missing, handle gen) |
| PATCH | `/api/trips/{tripId}/members/{tripUserId}` | change role | `{role}` | mirrors `dbUpdateUserFromTrip` |
| DELETE | `/api/trips/{tripId}/members/{tripUserId}` | remove member | — | mirrors `dbRemoveUserFromTrip` |

### Content (activities / accommodations / macroplans / expenses)
Generic pattern per entity; `{entity}` ∈ activity|accommodation|macroplan|expense:
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| POST | `/api/trips/{tripId}/{entity}` | create | entity fields (no id/timestamps) | server sets `id`, `createdAt`, `lastUpdatedAt` |
| PUT | `/api/trips/{tripId}/{entity}/{entityId}` | update | entity fields | server sets `lastUpdatedAt`; may need optimistic concurrency (see §4) |
| DELETE | `/api/trips/{tripId}/{entity}/{entityId}` | delete | — | also deletes its commentGroups+comments+object (`dbDeleteActivity` et al.) |

Special activity ops (mirror `db.ts`):
- `POST /api/trips/{tripId}/activities/{activityId}/drag-end` — body
  `{timestampStart, timestampEnd}`; clears the `IsIdea` flag (mirror
  `dbUpdateActivityDragEnd`).
- `POST /api/trips/{tripId}/activities/{activityId}/duplicate` — body
  `{timestampStart, timestampEnd}`; copies the activity to a new id (mirror
  `dbDuplicateActivityDragEnd`).

### Tasks / task lists
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| POST | `/api/trips/{tripId}/task-lists` | create task list | `{title,index,status}` | |
| PUT | `/api/trips/{tripId}/task-lists/{taskListId}` | update list | `{title,index,status}` | |
| DELETE | `/api/trips/{tripId}/task-lists/{taskListId}` | delete list (+tasks) | — | |
| POST | `/api/trips/{tripId}/task-lists/{taskListId}/tasks` | create task | task fields | |
| PUT | `/api/trips/{tripId}/task-lists/{taskListId}/tasks/{taskId}` | update task | task fields | |
| DELETE | `/api/trips/{tripId}/task-lists/{taskListId}/tasks/{taskId}` | delete task | — | |
| PATCH | `/api/trips/{tripId}/tasks/reorder` | bulk reorder | `[{taskId,index}]` | mirrors `dbUpdateTaskIndexes` |
| PATCH | `/api/trips/{tripId}/task-lists/reorder` | bulk reorder lists | `[{taskListId,index}]` | mirrors `dbUpdateTaskListIndexes` |
| POST | `/api/trips/{tripId}/tasks/{taskId}/move` | move task to another list | `{toTaskListId,newIndex}` | mirrors `dbMoveTaskToTaskList` |

### Comments
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| POST | `/api/trips/{tripId}/comment-groups` | create comment group + first comment | `{objectType, objectId, groupId?, content}` | mirrors `dbAddComment` (creates commentGroup + commentGroupObject + comment atomically; `groupId` reuse for replies) |
| PATCH | `/api/trips/{tripId}/comment-groups/{groupId}/status` | resolve/unresolve | `{status}` | mirrors `dbUpdateCommentGroupStatus` |
| PUT | `/api/trips/{tripId}/comment-groups/{groupId}/comments/{commentId}` | edit comment | `{content}` | mirrors `dbUpdateComment` |
| DELETE | `/api/trips/{tripId}/comment-groups/{groupId}/comments/{commentId}` | delete comment (+group if empty) | — | mirrors `dbDeleteComment` (2-step: delete comment, then delete group+object if no comments left) |

### Users
| Method | Path | Purpose | Body | Notes |
|---|---|---|---|---|
| PUT | `/api/users/me/preferences` | update preferred region/currency/timezone | partial `{region,currency,timeZone}` | mirrors `dbUpdateUserPreferences` |
| PATCH | `/api/users/me` | update handle / email / activation | `{handle?, email?}` | mirrors `dbUpdateUser`; handle uniqueness enforced server-side |
| POST | `/api/users/check-email` | email already taken? | `{email, excludeUserId?}` | mirrors `isEmailTakenByOtherUser` (returns `{taken:boolean}`) |
| POST | `/api/users/generate-handle` | get a unique random handle | — | mirrors `generateUniqueHandle` (returns `{handle}`) |

---

## 4. Behavior notes the backend must preserve

1. **Atomic multi-table writes** — `dbAddTrip`, `dbAddComment`, `dbDuplicateTrip`,
   `dbDeleteTrip` all span multiple entities in one `transact`. Use DB transactions.
2. **Auto-generate IDs + timestamps** — client passes no id; backend returns the
   created id (frontend stores use the returned `id`, e.g. `dbAddTrip` returns
   `{id}`). Where the frontend needs the id *before* the call (some dialogs), have
   the backend accept an optional `clientId`.
3. **Undo semantics** — several `db.ts` functions (`dbUpdateActivity`,
   `dbUpdateAccommodation`, `dbUpdateMacroplan`) snapshot the row, then restore it on
   undo. The API can ignore this (frontend keeps a local snapshot and issues a normal
   update to restore) or expose `PUT .../undo` with the snapshot body.
4. **Optimistic concurrency** — Instant's `merge` is last-write-wins. If you want
   stricter behavior, echo `lastUpdatedAt` in reads and reject writes whose
   `lastUpdatedAt` is older (optional).
5. **No realtime** — the frontend will fetch-on-load + optional `/api/sync`
   (see migration plan §5). Every GET above doubles as the "refresh after write".

---

## 5. Endpoint inventory (count)

| Group | Read | Write | Notes |
|---|---|---|---|
| Auth | 1 (`me`) | 6 | forgot/reset/login/logout/guest/upgrade |
| Trips | 3 (`/trips`, `/public`, `/{id}`) | 6 | create/update/delete/duplicate/sharing/sections |
| Members | 0 | 3 | add/update/remove |
| Activities | 0 | 4 | create/update/delete + drag-end + duplicate (5 incl. drag-end) |
| Accommodations | 0 | 3 | |
| Macroplans | 0 | 3 | |
| Expenses | 0 | 3 | |
| Task lists | 0 | 5 | CRUD + reorder + move |
| Tasks | 0 | 4 | CRUD + reorder + move |
| Comments | 0 | 4 | group+comment/status/edit/delete |
| Users | 1 (`me`) + 1 (`by-handle`) | 4 | prefs/update/check-email/generate-handle |

**~10 GET + ~45 write endpoints.** The two heavyweight reads are `GET /api/trips/{id}`
(the full graph) and `GET /api/trips/public` (paginated directory). Everything else is
thin CRUD over Eloquent models.
