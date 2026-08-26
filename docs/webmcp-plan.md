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

- **Always:** auth + account tools (`auth-get-current-user`, `auth-login`,
  `auth-signup`, `auth-logout`, `account-update-preferences`).
- **When signed in:** trip read/list/create tools (`trip-list`, `trip-get`,
  `trip-create`).
- **When a trip is loaded (`currentTripId`):** trip update/sharing/member-role
  tools plus the per-trip vocabulary for activity / accommodation / macroplan /
  expense / task / comment.
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
| Macroplan | `macroplan-get`, `macroplan-create`, `macroplan-update` |
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

   Configure `IKUYO_API_URL` if the frontend is not proxied to the backend.
   `localhost` is treated as a potentially trustworthy secure context by
   Chromium; use real HTTPS when testing from a non-local host.
4. Use a dedicated test account and a disposable test trip. Delete and member
   removal are intentionally performed only through the UI confirmation flow.

### Manual WebMCP registration check

Use the browser assistant / WebMCP test client enabled by the flag to inspect
and invoke the page tools. Confirm the following registration lifecycle:

| Page/state | Expected tools |
| --- | --- |
| `/login`, logged out | `auth-get-current-user`, `auth-login`, `auth-signup`, `auth-logout`, `account-update-preferences` |
| Signed in at `/trip` | Above plus `trip-list`, `trip-get`, `trip-create` |
| A loaded `/trip/:id` page | Above plus trip mutation/member tools and activity, accommodation, task, expense, macroplan, and comment tools |
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
4. Create one entity for each main flow and verify it with its matching read
   tool and the UI:
   - `activity-create` → `activity-get`
   - `accommodation-create` (provide required `checkIn` and `checkOut`) →
     `accommodation-get`
   - `task-list-create`, then `task-create` → `task-get`
   - `expense-create` → `expense-get`
   - `macroplan-create` → `macroplan-get`
   - `comment-add` → `comment-list`, then `comment-update` and
     `comment-resolve`
5. Confirm an invalid required field produces a descriptive retry-able error
   (for example an invalid ISO timestamp or a missing task title).
6. Build/run once with `IKUYO_READ_ONLY_MODE=true`; confirm each mutating tool
   fails before any backend write while all read tools still work.
7. Clean up the disposable entities and trip through their normal UI delete
   dialogs; these actions are intentionally absent from WebMCP.

## 7. Non-goals

- No backend transports, Resources, or Prompts (unsupported by WebMCP).
- No unregistering via `unregisterTool()` (removed) — only `AbortSignal`.
- No exposing secrets or DB credentials — all writes use the existing secure
  API layer.
- No converting existing HTML forms to the WebMCP *declarative* API; the app is
  a store-driven SPA, so the imperative API is the correct fit.