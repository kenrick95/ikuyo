# Offline mode plan

## Recommendation and scope

Use a minimal service worker to make the app itself reopen offline, and keep
explicitly prepared, read-only trip snapshots in IndexedDB. Limit the worker to
versioned app files and navigation; the application owns trip data, permissions,
and reconnect behavior. Keep a downloadable itinerary as a fallback. Offline
editing remains a separate phase requiring reliable retries and conflict handling.

This is a proposal, not an implemented feature. The initial scope favors
travelers looking up their itinerary when connectivity drops.

| Scenario | Initial behavior |
| --- | --- |
| Open a trip online, prepare it, then lose connectivity | Read supported trip sections and show when the snapshot was saved. |
| Navigate between prepared trips | Read saved trips using precached screens and detail dialogs. |
| Open an unprepared trip offline | Explain that it needs to be opened online first; offer saved trips. |
| Reload, open a new tab, or resume a browser-discarded tab offline | Load the installed app shell and prepared trips, provided browser storage remains available. |
| First-ever visit offline, or browser storage cleared/evicted | Offline launch is unavailable; use a previously downloaded itinerary. |
| A new app version is ready | Offer an explicit update; keep the current version usable until safe activation. |
| Reopen a downloaded itinerary offline | Read a standalone local file without the website or session. |
| Edit, complete tasks, comment, or change sharing offline | Disabled in the initial release. |
| Use maps, geocoding, or external links offline | Explain that these require connectivity; keep saved addresses and coordinates visible. |

The service worker supplies the HTML, JS, and CSS on offline navigation;
IndexedDB supplies saved trip data. Neither is a backup against browser storage
eviction. Mark a trip ready only after both the app installation and snapshot
save have succeeded. No background sync, API response cache, or offline writes
are included in the initial worker.
See [MDN's offline operation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation).

## Existing foundations and gaps

- `src/data/store.ts` already persists normalized trip collections and user
  identity through Zustand's localStorage persistence (`ikuyo-storage`, version
  3). This is an incidental cache without per-trip completeness or freshness
  metadata, and it can include optimistic state.
- `src/Trip/store/store.ts` fetches full trips, maps them through
  `src/data/apiTrip.ts`, and merges their child collections. Its errors are
  reduced to strings, so callers cannot distinguish access denial from a lost
  connection. `src/Trip/PageTrip.tsx` can keep rendering an existing trip after
  a refresh fails, without explicitly explaining that it is stale.
- `src/Auth/store.ts` clears cached identity on any session-fetch failure.
  `clearSession()` removes existing cached domain data, which must also cover
  any new offline storage.
- `src/data/usePeriodicTripSync.ts` polls while visible and refreshes on focus.
  It suppresses errors and has no explicit reconnect state.
- `src/App.tsx` and `src/Trip/PageTrip.tsx` lazy-load routes and trip sections;
  `rsbuild.config.ts` also splits dependencies. Saving data alone will leave
  some screens unable to open offline.
- `src/data/apiClient.ts`, entity `db.ts` modules, and
  `src/data/optimistic.ts` implement online mutations and optimistic UI, not a
  durable offline write queue. WebMCP provides additional mutation entry points.
- `src/Trip/TripMenu/print.ts` already generates itinerary HTML with
  `tripToHtml`; the trip menu exposes printing. Reuse this for a portable copy.
- `src/main.tsx` currently unregisters all service workers after startup.
  Replace this with explicit registration and an update coordinator. Roll out
  removal of that cleanup before enabling registration, so older running tabs
  cannot immediately unregister the new worker. Scope legacy cleanup to known
  obsolete registrations/caches; never delete every cache on the origin.
- The PHP front controller renders public-trip preview metadata. Preserve that
  server path for uncontrolled requests and crawlers; the worker must cache a
  generic static shell, never trip-specific PHP HTML or authenticated responses.

## Implementation phases

### 1. Keep a portable itinerary fallback

Add “Download itinerary” beside Print, using `tripToHtml` to create a standalone
HTML download. Include trip title, snapshot time, day plans, scheduled and
unscheduled activities, accommodation details, notes, and relevant time zones.
Audit coverage against the existing renderer rather than assuming it includes
every field. Label its scope: this itinerary does not include expenses, tasks,
or comments. Existing browser Print / Save as PDF is another portable option.

Embed styles, use system fonts, escape all user content, and require no remote
scripts, images, fonts, or API calls. External links remain optional online
actions. Tell users that this is a private local copy, cannot update itself, and
must be downloaded again after changes. Logging out cannot delete downloaded
files. Verify opening the actual saved file on mobile as well as desktop.

### 2. Add explicit saved-trip storage

Introduce a small IndexedDB repository, for example
`src/data/offlineTripRepository.ts`, separate from the live Zustand store.
Store one validated, complete, server-confirmed trip snapshot per
`{ accountId, tripId }`, with `schemaVersion`, `savedAt`, and completeness
metadata. Include all collections needed for home, list, timetable, expenses,
tasks, and comments, including display relationships. Preserve date, time-zone,
and currency values through the existing mapper.

“Prepare for offline use” must fetch successfully, validate the snapshot, commit
it atomically, and verify the active worker's complete app cache before reporting
readiness. The initial page may need one controlled reload; do not show success
while installation is merely pending. An empty collection is valid; a missing
required collection is incomplete. Trip list
cards alone never count as prepared trips. Do not save optimistic changes or
copy the old unscoped localStorage cache into trusted offline snapshots.

Keep Zustand as the UI state. Hydrate a selected snapshot through shared trip
normalization instead of creating a second rendering model. Refresh prepared
snapshots from successful full-trip responses, preserving the last complete
snapshot if a new fetch or storage write fails. Track data-saved status separately
from the installed shell version and cache readiness; recheck on startup and
after updates or missing-asset errors.

Provide saved-trip listing, per-trip removal, and “Remove all saved trips”.
Bound storage with an explicit trip/size budget; do not silently evict trips
the user prepared. Handle denied storage, quota errors, corruption, and schema
incompatibility with a clear failure state and the download alternative.
Version the repository independently of app deployments; migrate compatible
records and require an online refresh for incompatible ones. Avoid persisting
the same full domain data indefinitely in both localStorage and IndexedDB;
version the Zustand persistence change and retain only necessary preferences
and UI state once the snapshot path is established.

Browser storage is best effort and may be evicted. Optionally request persistent
storage after explicit preparation, but never treat a denied request as a
guarantee or show success after a failed save. See
[MDN's storage limits](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

### 3. Make the running app tolerate disconnection

- Add shared connectivity and freshness state. Browser online/offline events
  are hints; use real API results and bounded request timeouts to determine
  reachability. Distinguish transport failures, server failures, authentication
  failures, and access denial rather than flattening them into one error.
- Render a valid saved trip immediately with “Saved copy — updated at …”. On
  transport failure, retain it and mark it read-only. An unavailable server may
  also use the snapshot, but say “Unable to refresh” rather than incorrectly
  claiming the device has no internet. Give unsaved trips a useful empty state.
- Keep the last account identity as an offline display context on a transport
  failure, not proof of a valid session. A confirmed unauthenticated session or
  `401` must lock private snapshots pending login; confirmed `403`/`404` on a
  trip must remove its saved data and live collections. Never use cached roles
  as authorization to send writes.
- Namespace snapshots by account, clear them on logout/account switch, and
  propagate clearing across tabs. Cancel or ignore in-flight reads/writes from
  the previous session so late responses cannot restore cleared data. Anonymous
  public-trip saving is deferred initially to keep account boundaries explicit.
- Centralize a runtime write guard alongside existing maintenance/read-only
  checks. Apply it before optimistic changes and again at the mutation boundary,
  including direct calls and WebMCP. Disable all edit paths, drag/resize, task
  completion, comments, archive, sharing, and membership changes while using a
  saved copy. Preserve normal online permissions and archive restrictions.
- If connectivity disappears during a write, roll back optimistic UI and say
  the outcome is uncertain when the response was lost. Re-fetch after reconnect;
  do not automatically replay a mutation that may already have committed.
- Pause repeated polling while offline, then use a coalesced reconnect/focus
  refresh with backoff. Verify session and trip access, fetch a full snapshot,
  and only then restore editing. Preserve saved data on transient failures and
  apply deletions/permission changes on successful refresh. Keep the current
  cursor-poll mechanism; persistent incremental sync is unnecessary for v1.

Offline copies cannot learn about remote revocation until reconnect. Make this
limitation explicit when preparing private trips, as with downloaded files.

### 4. Install a minimal, versioned app shell

Add production-only registration at a stable same-origin `/sw.js` URL with root
scope over HTTPS. Disable registration on ordinary development servers and use
a production-like HTTPS or localhost preview for worker tests. Serve the worker
with revalidation (`Cache-Control: no-cache`) and exclude it from SPA rewrites;
use immutable caching for content-hashed assets.

Generate a revisioned precache manifest from Rsbuild output. Prefer a build-time
Workbox integration if it fits the Rspack pipeline; verify compatibility in an
implementation spike rather than assuming a Vite plugin applies. Include generic
shell HTML and the complete JS/CSS dependency closure for saved-trip navigation,
home, list, timetable, expenses, tasks, comments, and read-only dialogs. Audit
nested chunks, fonts, icons, and public-path URLs. Maps/geocoding remain online
features; exclude their dependencies only if they are not needed to boot the
supported views. Measure installation size and enforce a build budget.

For controlled, allowlisted SPA navigations, serve the active release's cached
generic shell consistently, online and offline, so HTML matches its assets.
Keep the requested URL for client routing. First visits and crawlers continue
through the PHP front controller. Exclude `/api`, authentication callbacks,
server-only paths, downloads, and non-GET requests from shell fallback. Serve
only manifest-listed static assets from the app cache; pass other requests to
the network. Never cache API responses, session/CSRF endpoints, mutations,
trip-specific metadata HTML, map tiles, or third-party responses.

Install into a release-specific cache without modifying the active release.
Reject installation if any required asset is missing, invalid, or cannot be
stored; do not accept an HTML SPA fallback as a successful JS download. Partial
candidate caches must never become active and should be cleaned on a later
successful run. Report “Ready offline” only with an active complete shell and a
complete selected trip snapshot. New tabs can then reopen prepared trips without
prefetching screens in each tab.

### 5. Make app updates explicit and safe

The default is install, wait, then activate when no old clients remain. Do not
call `skipWaiting()` unconditionally or use `clients.claim()` to take over
arbitrary existing pages. A routine reload does not necessarily activate a
waiting worker because the old client can overlap the navigation. See the
[service-worker lifecycle](https://web.dev/articles/service-worker-lifecycle).

1. Check for updates on online startup and throttled foreground/reconnect
   events using registration updates. Render the current app immediately;
   updates must not block reading a trip.
2. Download and validate the next release in the background. Keep the active
   release and snapshots intact if installation fails or connectivity drops.
3. Once a candidate is installed and waiting, show “Update available” with
   “Update and reload” and “Later”. Later continues the current release, including
   offline use. Do not force a reload while offline or while edits are unsaved.
4. On acceptance, coordinate all in-scope app tabs via worker messaging and
   client enumeration. Pause new mutations and wait for in-flight writes and
   snapshot transactions to finish. Every existing tab must acknowledge that
   it has no unsaved form data and is ready to reload. A dirty, suspended,
   unresponsive, or newly discovered tab blocks immediate activation; explain
   that other tabs must be saved/closed. A timeout is not consent. Use an
   activation lock and recheck the client set before proceeding.
5. Only after this handshake, message the waiting worker to `skipWaiting()`.
   Listen for `controllerchange` in participating tabs and reload once per
   target build. Ignore first-install events and prevent reload loops. If the
   client set cannot be coordinated safely, use the default close-all-tabs
   activation path instead. See [update guidance](https://web.dev/learn/pwa/update).
6. Retain the previous release cache during the transition. Serve its immutable
   hashed assets by exact URL if an old page requests them; never resolve its
   shell or unversioned assets from an arbitrary cache. Delete an old release
   only once no clients still need it; unknown client versions defer cleanup.
   This also covers tabs opening or resuming around the activation handshake.
   If storage cannot hold both releases, defer the update rather than deleting
   the working cache. Review Workbox's automatic activation cleanup against
   these retention requirements before adopting its defaults.

Publish versioned assets and a release-specific generic shell first, then the
worker referencing that exact release last. Keep the PHP entry point available
throughout deployment. Retain previous hashed assets on the server for a defined
grace period as well as in browser caches; never replace a hashed URL's contents.
Test interrupted deployments and a missing chunk before enabling updates.

Keep backend APIs compatible with returning older frontends for a documented
support window; supporting only the previous release may be insufficient for
long offline trips. After that window, require an online update before editing
but preserve readable snapshots where compatible. Version IndexedDB separately:
prefer additive migrations, handle blocked upgrades from other tabs, and never
delete a saved trip just because a new app build activates. Reject unsupported
schemas with a recovery path instead of partially interpreting them.

For rollback, publish a new worker revision pointing at a known-good shell,
using the same install/wait/update flow and verifying saved-data compatibility.
Disabling new registration alone cannot disable already installed workers.
Prepare a tested recovery worker at the same `/sw.js` URL that passes through
to the network and retires only Ikuyo app caches when it is safe. Preserve trip
snapshots and avoid origin-wide clearing. Recovery requires connectivity and
does not instantly reach offline users.

### 6. Consider offline editing only after the read path is proven

An optional later phase can sync entirely in the foreground without extending
the service worker: persist an outbox and local edit atomically before confirming
success, then sync when the app is open and online. Closing the tab pauses delivery.

Before enabling it, add server-side idempotency keys and durable deduplication,
entity revisions/conditional updates, dependency ordering for creates, and
explicit conflict handling for concurrent edits and remote deletions. Recheck
permissions and archive state on replay; pause for expired sessions. Coordinate
multiple tabs, bound retry/backoff, distinguish permanent rejection from
transport failures, and expose pending/failed/conflicting changes with recovery
actions. The current WebMCP retry cache is not a server-side delivery guarantee.
Start with a narrow mutation type rather than queueing arbitrary HTTP requests.

The app-shell worker does not solve write ordering or conflicts. Background
Sync is optional future work, not a dependency for reliable foreground replay.

## Verification and rollout

1. Ship and test the standalone download independently: no network requests,
   escaped hostile text, unscheduled activities, multiple time zones, long
   trips, and real mobile file opening.
2. Add repository tests for complete/partial payloads, atomic replacement,
   quota failure, migration, corrupt records, logout, account switches, and
   late responses. Verify failed saves never report readiness.
3. Add integration tests for cached/uncached routes, session transport failures
   versus `401`/`403`/`404`, disabled UI and WebMCP mutations, loss of connection
   mid-write, reconnect refresh, remote deletion, and archive/role changes.
4. Exercise a production build with networking disabled after preparation.
   Visit every promised view and detail dialog, including ones never opened
   before disconnection. Check maps degrade without breaking itinerary views.
5. Test fresh offline navigation to root and nested trip URLs after installation,
   browser restart, tab discard, expired sessions, and eviction. With storage
   intact, prepared trips must reopen; first visits and cleared storage remain
   unsupported. Verify API/auth requests never receive cached HTML or data.
6. Test v1-to-v2 updates in a production build: acceptance, postponement, offline
   download interruption, missing/invalid chunks, quota failure, multiple tabs,
   unsaved forms, in-flight mutations, suspended/new tabs, blocked DB migration,
   rollback, and recovery. Assert no partial release activation, lost edits,
   reload loop, premature cache deletion, or loss of readable saved trips.
   Cover Chromium, Firefox, and Safari including real mobile browsers.
7. Stage rollout: remove legacy unregister behavior first; verify precaching
   and updates in staging; enable registration and saved trips for a small
   cohort before wider release. Keep downloads independently available.
   Monitor preparation failures and reconnect recovery without recording trip
   contents. No backend changes are expected for the initial read-only scope;
   deployment/header changes and API compatibility policy are required.
   Offline editing requires a separate backend/API design and rollout.
