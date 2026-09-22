# Offline mode plan

## Recommendation and scope

Start with read-only access to explicitly prepared trips in an already-open
tab, plus a downloadable itinerary for use after closing the browser. Keep
service workers out of this implementation. Offline editing is a separate,
later phase because reliable retries and collaboration conflicts need backend
support, regardless of whether a service worker is used.

This is a proposal, not an implemented feature. The initial scope favors
travelers looking up their itinerary when connectivity drops.

| Scenario | Initial behavior |
| --- | --- |
| Open a trip online, prepare it, then lose connectivity | Read supported trip sections and show when the snapshot was saved. |
| Navigate between prepared trips in the same running app | Read saved trips whose required code has finished loading. |
| Open an unprepared trip offline | Explain that it needs to be opened online first; offer saved trips. |
| Reload, open a new tab, or resume a browser-discarded tab offline | Not guaranteed; use the downloaded itinerary. |
| Reopen a downloaded itinerary offline | Read a standalone local file without the website or session. |
| Edit, complete tasks, comment, or change sharing offline | Disabled in the initial release. |
| Use maps, geocoding, or external links offline | Explain that these require connectivity; keep saved addresses and coordinates visible. |

Persisting data does not make the website itself available on a fresh offline
navigation. IndexedDB and the HTTP cache cannot guarantee loading the HTML and
all required assets. A service worker can intercept navigation and supply those
assets, but brings the lifecycle the user wants to avoid. Do not advertise
reliable offline app launches or rely on ordinary browser caching as a contract.
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
- `src/main.tsx` intentionally unregisters old service workers. Keep that
  behavior. The PHP front controller's private/public metadata behavior and
  existing API cache protections do not need to change.

## Implementation phases

### 1. Ship a portable itinerary first

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
it atomically, and load required view code before reporting readiness. An empty
collection is valid; a missing required collection is incomplete. Trip list
cards alone never count as prepared trips. Do not save optimistic changes or
copy the old unscoped localStorage cache into trusted offline snapshots.

Keep Zustand as the UI state. Hydrate a selected snapshot through shared trip
normalization instead of creating a second rendering model. Refresh prepared
snapshots from successful full-trip responses, preserving the last complete
snapshot if a new fetch or storage write fails. Track data-saved status separately
from code-ready status, since code readiness lasts only for the current tab.

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

### 4. Prepare code as well as data

Extract shared import loaders for the supported trip views and their read-only
detail dialogs. Preparing a trip should execute those imports and wait for all
required JS/CSS dependencies; merely adding prefetch hints is insufficient.
Audit nested dynamic imports and external assets. Include saved-trip navigation
and recoverable chunk-load errors. Skip the map SDK and show a text fallback.

Keep the UI wording precise: “Ready in this tab; download an itinerary to reopen
offline.” If the tab is discarded or reloaded, that readiness is lost even when
the data survives. Test the production build, where chunk and CSS behavior can
differ from development.

No app-shell cache or service-worker update flow is introduced. Continue normal
deployments, retain old hashed assets for a defined deployment grace period so
open tabs can finish loading, and offer an online reload for missing chunks.
Do not force reloads while offline. Repository schema compatibility, rather
than a cached application shell, governs which saved data new code can read.

### 5. Consider offline editing only after the read path is proven

An optional later phase can run entirely in the foreground without a service
worker: persist an outbox transactionally before confirming a local edit, then
sync when the app is open and online. Closing the tab pauses delivery.

Before enabling it, add server-side idempotency keys and durable deduplication,
entity revisions/conditional updates, dependency ordering for creates, and
explicit conflict handling for concurrent edits and remote deletions. Recheck
permissions and archive state on replay; pause for expired sessions. Coordinate
multiple tabs, bound retry/backoff, distinguish permanent rejection from
transport failures, and expose pending/failed/conflicting changes with recovery
actions. The current WebMCP retry cache is not a server-side delivery guarantee.
Start with a narrow mutation type rather than queueing arbitrary HTTP requests.

If reliable offline reopening of the full interactive app becomes essential,
revisit that requirement explicitly. Options are a minimal versioned app-shell
service worker or a packaged app with bundled assets; both are additional scope.
Keep the portable itinerary as the no-service-worker solution for now.

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
5. Test two tabs, expired sessions, storage eviction, browser restart, tab
   discard, and deployment while a tab is open. Fresh offline navigation is an
   explicitly unsupported app case; the downloaded itinerary must still open.
6. Release saved-trip support behind a feature flag after the download ships.
   Monitor preparation failures and reconnect recovery without recording trip
   contents. No backend changes are expected for the initial read-only scope;
   offline editing requires a separate backend/API design and rollout.
