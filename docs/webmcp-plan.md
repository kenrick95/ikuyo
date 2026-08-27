# Plan: WebMCP support for Ikuyo

**Branch:** `feat/webmcp-tools` (based on `main`)
**Status:** Implemented (this document is the "plan first" artifact + record of
implementation)

## 1. Goal

Expose Ikuyo's main client-side flows to AI agents, browser assistants, and
assistive technologies via the **WebMCP** browser-native API
(`document.modelContext`), so an agent can safely read and mutate trip data the
same way the UI does.

WebMCP runs entirely **client-side** in the browser tab (no HTTP/SSE/stdio
transports). Only the **Tools** primitive is supported (no Resources/Prompts).
It requires Chromium `146.0.7672.0+` with `#enable-webmcp-testing` and a
secure (HTTPS) context.

## 2. Reference docs (included as a skill)

The two upstream reference documents are bundled into a pi skill so any future
agent working on WebMCP here has the canonical guidance available:

- `.pi/skills/webmcp/SKILL.md` — quick entry point / best practices.
- `.pi/skills/webmcp/references/webmcp.md` — the WebMCP overview.
- `.pi/skills/webmcp/references/agentic-javascript-tools.md` — the Imperative
  API (`registerTool`), lifecycle, schema + fallback guidance.

Sources:
- https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/webmcp/webmcp.md
- https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/webmcp/agentic-javascript-tools.md

## 3. Architecture

New module: `src/webmcp/`

```
src/webmcp/
├── modelContext.ts        # feature detection + registerTool() helper + types
├── schema.ts              # JSON-Schema param helpers + epoch/ISO converters
├── tripDates.ts           # trip date bounds + partial-update conversion
├── context.ts             # auth / current-trip guards shared by tools
├── useWebMCPTools.ts      # React hook: registers tools, aborts on unmount
├── auth.tools.ts          # auth + account preferences tools
├── trip.tools.ts          # trip create/update + sharing/sections/members tools
├── activity.tools.ts      # activity create/read/update tools
├── accommodation.tools.ts # accommodation create/read/update tools
├── task.tools.ts          # task + task-list create/read/update tools
├── expense.tools.ts       # expense create/read/update tools
├── macroplan.tools.ts     # macroplan create/read/update tools
├── comment.tools.ts       # comment list/add/update/resolve tools
└── WebMCPTools.tsx        # wiring component rendered once in App
```

### modelContext.ts

- `getModelContext()`: feature-detects `document.modelContext` with a
  `navigator.modelContext` fallback; returns `undefined` when unsupported.
- `registerToolIfSupported(tool, signal)`: wraps `registerTool`, passing the
  per-session `AbortSignal`, and **no-ops silently** on unsupported browsers so
  normal use is unchanged.
- **Cleanup:** WebMCP has no `unregisterTool()`; a tool is released by aborting
  the `AbortSignal` passed at registration. `useWebMCPTools` aborts its
  controller on every context change / unmount.

### Reads & writes

- **Reads** come from the existing zustand store (`useBoundStore.getState()`),
  the already-synced source of truth, so tools return live data with no extra
  network round-trips. Trip listing fetches `/api/trips` directly so it is
  always fresh.
- **Writes** delegate to the existing `db*` functions (`dbAddTrip`,
  `dbAddActivity`, `dbAddAccommodation`, `dbAddTask`, `dbAddExpense`,
  `dbAddMacroplan`, `dbAddComment`, …), which already route to the Laravel/MySQL
  backend with CSRF + optimistic updates. Tools are thin adapters over the same
  code the UI uses — they never reimplement API access or auth.
- **Safety:** destructive actions (delete and member removal) are deliberately
  not exposed as WebMCP tools: they require a manual UI confirmation outside an
  agent's control. Other writes refuse when the app is in read-only mode
  (`assertWritable`) and use the same mutation layer as the UI.

### Tool registration strategy

Tools are registered **dynamically** per current app context (see
`WebMCPTools.tsx`):

- **When logged out:** `auth-get-current-user`, `auth-login`, and
  `auth-signup`.
- **When signed in:** `auth-get-current-user`, `auth-logout`,
  `account-update-preferences`, plus trip read/list/create tools (`trip-list`,
  `trip-get`, `trip-create`).
- **When a trip is loaded (`currentTripId`):** read tools are available to any
  authenticated visitor; create/update entity tools require an invited
  **editor** or **owner** role; sharing, section visibility, and member-role
  tools require **owner**. Member roles are limited to editor/viewer.
- Read-only tools set `annotations: { readOnlyHint: true }` (placed **after**
  `execute`) so agents know they are safe.

## 4. Flows covered

| Flow | Tools |
| --- | --- |
| Auth / account | `auth-get-current-user`, `auth-login`, `auth-signup`, `auth-logout`, `account-update-preferences` |
| Trip list | `trip-list` |
| Trip | `trip-get`, `trip-create`, `trip-update`, `trip-update-sharing`, `trip-update-sections`, `trip-add-member`, `trip-update-member` |
| Activity | `activity-get`, `activity-create`, `activity-update` |
| Accommodation | `accommodation-get`, `accommodation-create`, `accommodation-update` |
| Day plan (stored internally as a macroplan) | `day-plan-get`, `day-plan-create`, `day-plan-update` |
| Expense | `expense-get`, `expense-create`, `expense-update` |
| Task | `task-list-create`, `task-list-update`, `task-create`, `task-get`, `task-update` |
| Comment | `comment-list`, `comment-add`, `comment-update`, `comment-resolve` |

## 5. Schema design

- Every parameter has a concrete JSON-Schema type + `description`.
- Timestamps accept **epoch ms** (number) or **ISO-8601 strings** (converted by
  `schema.ts#toEpochMs`); trip/macroplan dates accept `YYYY-MM-DD` via the trip
  timezone.
- Timezones are IANA names, amounts are plain numbers.
- Tools accept raw user input (no agent-side arithmetic).
- Constraints (required fields, valid ranges) are validated in code and
  returned as descriptive errors for agent retries.

## 6. How to test

### Automated checks

Run these from the repository root:

```bash
# JSON-Schema/time validation plus partial trip-date update regression coverage.
CI=1 pnpm exec vitest run src/webmcp/schema.test.ts src/webmcp/tripDates.test.ts

# Formatting and linting for the integration and its App wiring.
CI=1 pnpm exec biome check src/webmcp src/App.tsx

# Check integration-specific TypeScript errors. The repository currently has a
# known main-branch InstantDB-migration typecheck baseline outside src/webmcp.
CI=1 pnpm typecheck 2>&1 | grep -E 'src/webmcp|src/App.tsx'
```

The final command should print no matches. Its `grep` exit status is non-zero
when there are no matches, so treat empty output as success; run the full
`pnpm typecheck` separately when the existing InstantDB baseline is resolved.

### Browser prerequisites

1. Use Chromium/Chrome/Edge **146.0.7672.0 or later**.
2. Enable `chrome://flags/#enable-webmcp-testing` and relaunch the browser.
3. Start the app and its API/session backend with a local development
   configuration:

   ```bash
   pnpm dev:backend       # terminal 1, Laravel API at http://localhost:8999
   pnpm dev               # terminal 2, frontend at http://localhost:5173
   ```

   The frontend development server proxies `/api` requests to the backend.
   `localhost` is treated as a potentially trustworthy secure context by
   Chromium; use real HTTPS when testing from a non-local host.
4. Use a dedicated test account and a disposable test trip. Delete and member
   removal are intentionally performed only through the UI confirmation flow.

### Manual WebMCP registration check

Use the browser assistant / WebMCP test client enabled by the flag to inspect
and invoke the page tools. Confirm the following registration lifecycle:

| Page/state | Expected tools |
| --- | --- |
| `/login`, logged out | `auth-get-current-user`, `auth-login`, `auth-signup` |
| Signed in at `/trip` | `auth-get-current-user`, `auth-logout`, `account-update-preferences`, `trip-list`, `trip-get`, `trip-create` |
| A loaded viewer/public `/trip/:id` | Signed-in tools plus entity read tools only |
| A loaded editor `/trip/:id` | Viewer tools plus trip/entity create and update tools |
| A loaded owner `/trip/:id` | Editor tools plus sharing, section-visibility, and member-role tools |
| Navigate away from `/trip/:id` | Per-trip tools disappear; this verifies the `AbortSignal` cleanup path |

On an unsupported browser, verify normal login/trip UI still works and no
console error is emitted: the integration must be a feature-detected no-op.

### End-to-end disposable-data checklist

1. Call `auth-get-current-user`; sign in using `auth-login` or create the
   dedicated test user with `auth-signup`.
2. Call `trip-create` with a unique title such as `WebMCP QA <timestamp>`;
   open the returned trip in the UI so it is loaded into the store.
3. Verify `trip-get`, then use `trip-update`, `trip-update-sharing`, and
   `trip-update-sections`; refresh the page and confirm each change persisted.
   Also test a timezone-only `trip-update` and a single-date update to confirm
   the intended calendar dates are retained.
4. Create one entity for each main flow and verify it with its matching read
   tool and the UI:
   - `activity-create` → `activity-get`
   - `accommodation-create` (provide required `checkIn` and `checkOut`) →
     `accommodation-get`
   - `task-list-create`, then `task-create` → `task-get`
   - `expense-create` → `expense-get`
   - `day-plan-create` → `day-plan-get`
   - `comment-add` → `comment-list`, then `comment-update` and
     `comment-resolve`
5. Confirm an invalid required field produces a descriptive retry-able error
   (for example an invalid ISO timestamp or a missing task title).
6. Confirm a viewer sees no mutation tools, an editor sees entity create/update
   tools but no sharing/member tools, and an owner sees all non-destructive
   trip tools. Build/run once with `IKUYO_READ_ONLY_MODE=true`; confirm each
   visible mutating tool fails before any backend write while all read tools
   still work.
7. Clean up the disposable entities and trip through their normal UI delete
   dialogs; these actions are intentionally absent from WebMCP.

## 7. Non-goals

- No backend transports, Resources, or Prompts (unsupported by WebMCP).
- No unregistering via `unregisterTool()` (removed) — only `AbortSignal`.
- No exposing secrets or DB credentials — all writes use the existing secure
  API layer.
- No converting existing HTML forms to the WebMCP *declarative* API; the app is
  a store-driven SPA, so the imperative API is the correct fit.

## 8. Reliability and itinerary-semantics follow-up plan

### Problem observed

During browser-assisted testing, a page route/context could change between a
tool discovery and a later mutation. The browser then correctly rejected the
stale WebMCP tool handle. Long sequences of individual create calls also made
partial completion likely: some entries could be saved before the context
expired.

### Testing findings: technical friction and missing tools

The end-to-end trip-planning test also exposed gaps that make an otherwise
valid agent workflow unnecessarily brittle:

- **Route-dependent discovery:** the landing/trip-list page exposes only the
  account and trip tools. Activity, day-plan, and other entity tools appear
  only after opening the trip. An agent must therefore drive the UI or guess a
  route before it can discover the tools required to continue planning.
- **No explicit trip-context operation:** `trip-get` reads only a trip already
  loaded into client state. There is no read-only `trip-open`/`trip-load` tool
  for loading a known trip id and registering the corresponding tool set.
- **Single-item writes only:** creating a normal itinerary requires one
  `day-plan-create` call per day and one `activity-create` call per entry. This
  makes longer plans slow, raises the chance of a stale context, and leaves
  partially saved data if a sequence is interrupted.
- **No relationship tool for itinerary structure:** activities cannot be
  explicitly attached to a day plan/macroplan. The agent can align dates and
  times, but cannot express or verify that a particular activity belongs to a
  named day plan.
- **No planning-oriented transport or event lookup:** the tools store a train
  or performance once an agent has researched it elsewhere, but cannot search
  schedules, validate a proposed service, or retrieve venue event details.
  The agent must use an external source and record the source/uncertainty in
  the activity description.
- **No idempotency or batch result contract:** retries after a connection,
  approval, or context interruption risk duplicate itinerary items, and the
  caller cannot atomically learn which subset of a multi-step itinerary was
  committed.

### Planned improvements

1. Keep a minimal, stable trip-scoped tool set registered whenever an
   authenticated trip id is known; do not require a particular view such as
   Home or Timetable merely to expose entity tools.
2. Make every create operation retry-safe with an optional caller-supplied
   `idempotencyKey`. Return the existing entity for a repeated key rather than
   creating a duplicate.
3. Add bounded batch tools such as `day-plan-create-many` and
   `activity-create-many`. Validate all input before writing; return ordered
   per-item results and an explicit partial-failure contract.
   Include an optional `dayPlanId`/`macroplanId` on activity creation (and a
   corresponding activity-membership read field) so a saved itinerary retains
   its intended day-plan structure.
4. Avoid unnecessary route replacement/reload after a mutation. When routing
   is necessary, immediately register the replacement tool set so an agent can
   rediscover it predictably.
5. Provide a route/context helper (for example `trip-open`) or make
   `trip-get` hydrate the requested trip into the local store, so an agent can
   enter a trip context without driving the visual UI.
6. Extend the manual test matrix with a delayed approval/re-fetch scenario,
   retries using the same idempotency key, and batch interruption after each
   item.
7. Decide whether transport and event discovery are product capabilities. If
   so, add read-only, source-attributed tools such as `transport-search` and
   `venue-events-search`; otherwise document that these facts must be checked
   externally and stored as provisional itinerary notes.

### `isIdea` semantics

`isIdea` must mean **unscheduled backlog option**, not “scheduled but still
tentative.” An activity belongs in the normal timetable when it has a planned
time, even if its booking, exact train, or performance time needs later
confirmation.

Update the tool descriptions and examples accordingly:

- `isIdea: true`: an option without a committed day/time, kept for possible
  later use and intentionally absent from the timetable.
- `isIdea: false` (the default): an activity scheduled on the itinerary,
  including a provisional/estimated schedule.
- Put uncertainty in `description`, for example: “Tentative: confirm the
  October timetable when it is published.”

For clearer machine guidance, consider adding an optional
`planningStatus: "planned" | "tentative" | "confirmed"` field. This is
separate from placement: all three statuses may be shown on the timetable;
only `isIdea: true` keeps an item in the idea backlog. Do not infer
`isIdea: true` solely from an uncertain time.

### Location semantics and geocoding

The current `activity-create` schema accepts location text and optional
coordinates, but it does not geocode a place name. An agent that supplies only
`location` therefore creates a valid activity without map coordinates.

Revise the coordinate field descriptions to say that a mapped place should
include both latitude and longitude (and the destination pair for a journey),
with WGS84 decimal degrees. Also add either:

1. a read-only `place-search` / `geocode` tool that returns canonical names,
   coordinates, and an optional recommended zoom, or
2. a write-time `geocodeLocation: true` option which resolves a supplied name
   and returns the resolved coordinates plus a confidence/error result.

Do not silently geocode ambiguous names. Return candidates and require an
agent to choose one; this prevents a location label from being pinned in the
wrong city. If coordinate lookup is unavailable, the tool should make the
missing-map result explicit rather than implying that a location string will
appear on the map.

### Accommodation semantics and discovery

Apply the same map contract to `accommodation-create` and
`accommodation-update`: `name` and `address` are display/search text, not a
geocode request. A mapped accommodation should include `locationLat` and
`locationLng` in WGS84 decimal degrees (with optional `locationZoom`), or be
resolved first through the shared `place-search` / `geocode` tool.

Accommodation tools should also state that a record represents an actual
planned stay and therefore requires check-in and check-out. An unselected
hotel or rental belongs in the unscheduled idea backlog, not in the
accommodation timeline.

Add a read-only accommodation-discovery tool only if the product deliberately
supports recommendations, for example `accommodation-search` with explicit
destination, dates, guest count, price range, and preferences. It should
return candidates only; creating an accommodation remains a separate action
after the agent or user chooses one. This avoids inventing a hotel booking or
silently assigning a stay when the traveller has not specified lodging needs.
