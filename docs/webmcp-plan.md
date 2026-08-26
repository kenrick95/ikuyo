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
├── context.ts             # auth / current-trip guards shared by tools
├── useWebMCPTools.ts      # React hook: registers tools, aborts on unmount
├── auth.tools.ts          # auth + account preferences tools
├── trip.tools.ts          # trip CRUD + sharing/sections/members tools
├── activity.tools.ts      # activity CRUD tools
├── accommodation.tools.ts # accommodation CRUD tools
├── task.tools.ts          # task + task-list CRUD tools
├── expense.tools.ts       # expense CRUD tools
├── macroplan.tools.ts     # macroplan CRUD tools
├── comment.tools.ts       # comment list/add/update/resolve/delete tools
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
- **Safety:** destructive tools (`*-delete`) are described as **HIGH-RISK** and
  refuse when the app is in read-only mode (`assertWritable`). All mutating
  actions go through the same flows the UI uses.

### Tool registration strategy

Tools are registered **dynamically** per current app context (see
`WebMCPTools.tsx`):

- **Always:** auth + account tools (`auth-get-current-user`, `auth-login`,
  `auth-signup`, `auth-logout`, `account-update-preferences`).
- **When signed in:** trip read/list/create tools (`trip-list`, `trip-get`,
  `trip-create`).
- **When a trip is loaded (`currentTripId`):** full trip mutation tools
  (update/delete/sharing/sections/members) plus the per-trip vocabulary for
  activity / accommodation / macroplan / expense / task / comment.
- Read-only tools set `annotations: { readOnlyHint: true }` (placed **after**
  `execute`) so agents know they are safe.

## 4. Flows covered

| Flow | Tools |
| --- | --- |
| Auth / account | `auth-get-current-user`, `auth-login`, `auth-signup`, `auth-logout`, `account-update-preferences` |
| Trip list | `trip-list` |
| Trip | `trip-get`, `trip-create`, `trip-update`, `trip-delete`, `trip-update-sharing`, `trip-update-sections`, `trip-add-member`, `trip-update-member`, `trip-remove-member` |
| Activity | `activity-get`, `activity-create`, `activity-update`, `activity-delete` |
| Accommodation | `accommodation-get`, `accommodation-create`, `accommodation-update`, `accommodation-delete` |
| Macroplan | `macroplan-get`, `macroplan-create`, `macroplan-update`, `macroplan-delete` |
| Expense | `expense-get`, `expense-create`, `expense-update`, `expense-delete` |
| Task | `task-list-create`, `task-list-update`, `task-list-delete`, `task-create`, `task-get`, `task-update`, `task-delete` |
| Comment | `comment-list`, `comment-add`, `comment-update`, `comment-resolve`, `comment-delete` |

## 5. Schema design

- Every parameter has a concrete JSON-Schema type + `description`.
- Timestamps accept **epoch ms** (number) or **ISO-8601 strings** (converted by
  `schema.ts#toEpochMs`); trip/macroplan dates accept `YYYY-MM-DD` via the trip
  timezone.
- Timezones are IANA names, amounts are plain numbers.
- Tools accept raw user input (no agent-side arithmetic).
- Constraints (required fields, valid ranges) are validated in code and
  returned as descriptive errors for agent retries.

## 6. Rollout / verification

1. `pnpm typecheck` — no errors in `src/webmcp` / `src/App.tsx` (the remaining
   repo errors are the pre-existing InstantDB-migration baseline on `main`).
2. `biome check src/webmcp src/App.tsx` passes.
3. Unit tests for the schema helpers: `src/webmcp/schema.test.ts`
   (`npx vitest run src/webmcp/schema.test.ts`).
4. Manual: enable `chrome://flags/#enable-webmcp-testing` in Chromium 146+,
   run `pnpm dev` over HTTPS, confirm `document.modelContext` lists the expected
   tools per route and that `execute` produces correct store/backend changes.
5. Feature detection keeps all existing browsers working unchanged.

## 7. Non-goals

- No backend transports, Resources, or Prompts (unsupported by WebMCP).
- No unregistering via `unregisterTool()` (removed) — only `AbortSignal`.
- No exposing secrets or DB credentials — all writes use the existing secure
  API layer.
- No converting existing HTML forms to the WebMCP *declarative* API; the app is
  a store-driven SPA, so the imperative API is the correct fit.