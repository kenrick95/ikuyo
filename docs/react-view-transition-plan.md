# React ViewTransition integration plan

## Direction

Replace imperative browser transition orchestration and manually assigned DOM
transition names with React 19.3's `<ViewTransition>`. Keep Wouter, existing
routes, Radix dialogs, and Zustand domain state. Start with navigation and the
existing trip-card-to-page effect; avoid adding animations to editing, polling,
or drag-and-drop as part of this migration. This document proposes work only.

The latest fetched `main` (`0682b9c`) already declares and locks React,
React DOM, and their types at 19.3, with Wouter 3.11. React confirms that
`ViewTransition` is stable in [React 19.3](https://react.dev/blog/2026/09/09/react-19-3).
No experimental React dependency is needed. The local installed Wouter is still
3.10, so implementation must first install the frozen lockfile and verify the
actual installed exports/types rather than relying on the current node_modules.

React manages browser transition capture and names for participating boundaries.
Use generated names normally, but keep a stable `name` prop for matching separate
components across routes. Removing every name would also remove the trip-card
shared-element relationship. Styling should use transition classes, independent
of identity. See the [component reference](https://react.dev/reference/react/ViewTransition).

## Current implementation and migration targets

| Location | Current behavior | Proposed change |
| --- | --- | --- |
| `src/App.tsx` | Wouter `aroundNav` calls `document.startViewTransition`, forces a commit with `flushSync`, and tracks a global pending transition. | React-owned route state and transitions; remove manual capture, pending bookkeeping, and navigation replay on animation errors. |
| `src/Trips/TripCard.tsx`, `src/Trip/PageTrip.tsx` | Inline `viewTransitionName` and `viewTransitionClass` match card and page. | Paired `<ViewTransition name={...} share="vt-trip-card">` boundaries around their existing host elements. |
| `src/Trip/viewTransition.ts` | Generates a stable per-trip name. | Retain or rename as a shared identity helper used only by React props. |
| `src/Nav/Navbar.module.css`, `src/Nav/Navbar.tsx` | Global CSS name on a navbar that appears in individual pages. | React boundary; use an explicit shared identity only for matching separate navbar instances. |
| `src/Trip/TripMenu/TripMenuFloating.module.css` and component | Static container name and a CSS name targeting Radix's private indicator DOM. | React boundary for the container; let Radix animate its indicator. Remove the indicator name and its native transition rules. |
| `src/Map/TripMap.tsx` | Inline per-trip map name, including when the ID is unavailable. | Start with an automatically named boundary on an app-owned map container; defer map-to-map shared morphing until canvas behavior is verified. |
| `src/Macroplan/viewTransition.ts` | Name helper with no current consumers found. | Confirm it is unused and remove it; do not invent a new dialog animation. |
| `src/Loading/withLoading.tsx` | Each lazy page gets its own Suspense fallback. | Review boundary placement for navigation so a newly mounted spinner does not interrupt card sharing. |

Public cards currently have no manual transition name. Keep that scope unchanged
initially; archived lists using `TripCard` should inherit the same migration.

## 1. Prove router compatibility before replacing animations

The key constraint is Wouter's default location hook: its external-store updates
are synchronous, so `startTransition(() => navigate(...))` alone cannot enable
React's component transitions. Wouter explicitly distinguishes this from its
native-browser recipe in its [routing documentation](https://github.com/molefrog/wouter#how-do-i-use-wouter-with-view-transitions-api).
Zustand writes have the same underlying limitation; wrapping them in
`startTransition` does not make them transition-capable. See
[React's external-store caveats](https://react.dev/reference/react/useSyncExternalStore#caveats).

Build a small browser proof using the locked versions: two Wouter routes, one
lazy destination, a shared card boundary, and actual client navigation. Verify
React activates it, not merely that the URL changes or a mocked browser API runs.

Recommended integration: a single React state owner above the configured Router,
exposing a custom Wouter `hook` and `searchHook` through context. All consumers
read one committed route snapshot, containing pathname, search, hash, and history
state. Nested routers must share it; do not create an independent `useState`
location per `useLocation` consumer or keep synchronous URL subscriptions in the
rendered route tree.

The owner should:

- Preserve Wouter's target resolution, nested bases, `~` absolute targets,
  replacement, and history state. Let Wouter resolve its targets, then update
  browser history exactly once and schedule the React snapshot with
  `startTransition` for eligible app navigation.
- Keep navigation imperative effects out of React state updater functions,
  which can be retried. Deduplicate history notifications from the same action.
  Handle rapid A-to-B-to-C navigation so the last target wins without extra
  history entries, obsolete route effects, or stale lazy content committing.
- Observe direct history changes, popstate, and hash changes centrally. For the
  initial migration, commit legacy Back/Forward events urgently without animation
  and preserve browser scroll/form restoration. Animated history traversal via
  the Navigation API is a later enhancement, not a prerequisite.
- Keep query, fragment, and history-state-only changes coherent even when the
  pathname is unchanged. Audit `history.state` reads in `DialogRoute.tsx` and
  `TripTimetableView/Timetable.tsx`; use the committed snapshot when rendering,
  so a pending URL does not supply the wrong dialog mode to an older page.
- Move route-dependent authentication redirects under the configured Router.
  Today `useRedirectUnauthenticatedRoutes()` runs in `App` above that Router and
  would otherwise keep reading the default location source. Audit telemetry,
  navigation menus, redirects, and programmatic callers for the same split.

Keep `aroundNav` as a small policy/dialog-cleanup entry point if useful, but put
React scheduling in the state owner. Close imperative dialogs before scheduling
the route update so synchronous Zustand cleanup does not interrupt that update.
Preserve existing route-dialog dismissal and unsaved-edit confirmation behavior.
Auth/security redirects and navigation away from dialogs should remain urgent.

The URL may lead the rendered page while a lazy destination is pending. Show a
small pending indication, base UI decisions on the committed snapshot, and test
redirects, cancellation, errors, scroll, and focus explicitly. If this adapter
cannot preserve navigation correctness, stop at the proof and document the gap;
do not claim a wrapper-only migration succeeds or silently switch routers.

## 2. Introduce component boundaries

Place the trip-card boundary before its existing `<li>` and the detail boundary
before the existing page `<div>`; the React component adds no extra layout node.
Conceptually, both sides use:

```tsx
<ViewTransition
  name={getTripCardViewTransitionName(tripId)}
  default="none"
  share="vt-trip-card"
>
  {/* Existing card or detail host element */}
</ViewTransition>
```

This requests the existing shared effect without making every trip-data update
animate. Keep list keys based on trip ID. Ensure only one mounted participant
uses each shared identity per tree: duplicated cards, overlapping route trees,
and retained loading pages must not introduce collisions.

Use a separate, automatically named boundary for changes between trip sections;
the outer trip boundary remains mounted during those navigations. Scope its
animation class to the content so the navbar, floating controls, dialogs, and
toasts do not become one giant moving screenshot. Avoid unnecessary keys on the
whole Router or trip page, which would reset forms, scroll, or map instances.

For page-specific navbar instances, a shared React name can preserve continuity;
for persistent instances, generated identity is enough. Give stationary chrome
a class with no movement/cross-fade where needed rather than assuming
`default="none"` prevents inclusion in an ancestor's snapshot. Check the actual
Radix host nodes and avoid two boundaries targeting the same DOM element.

Keep the Radix segmented-control indicator's own animation; do not access or
recreate its internal DOM just to wrap it. For maps, verify WebGL snapshots,
popups, resize handling, and init/cleanup. Accept a simple map-area fade or no
map animation rather than introducing map lifecycle changes.

## 3. Coordinate lazy loading and transition policy

React sharing requires both endpoints in the same transition; an intermediate
Suspense fallback breaks that match. An existing Suspense boundary can retain
content during navigation, but a newly mounted boundary may show its fallback.
Legacy popstate animation is also skipped by React. These constraints are
documented in the [ViewTransition reference](https://react.dev/reference/react/ViewTransition).

Introduce a stable route-level Suspense boundary for the animated content and
review the per-route `withLoading()` boundaries that would intercept suspension
first. Keep local fallbacks where useful outside navigation. Extract reusable
lazy loaders to warm trip code on intent (focus/pointer hover) if measurement
justifies it; warming is an optimization, not the only correctness mechanism.

Trip data still loads through effects and Zustand. React will not automatically
wait for those requests. Initially allow the destination's stable page frame or
skeleton to participate, followed by ordinary non-animated data arrival. Test
cold and cached trips separately; do not promise a full-content morph on a cold
fetch or convert the entire data layer to Suspense for this work.

Centralize navigation eligibility using parsed routes from `src/Routes`, rather
than extending pathname substring checks. Preserve suppression for transitions
to/from list and timetable detail dialogs, and audit task-dialog routes too.
Keep Radix responsible for portal/dialog animations and focus handling.

Honor reduced motion at runtime and in global transition CSS, including Suspense
reveals that can occur outside a navigation handler. Skip hidden-document
animations; browsers without the necessary API still navigate normally. Keep
data refreshes, drag/resize, typing, and task toggles urgent. Do not add a second
native transition engine as a compatibility fallback.

## 4. Replace styles and remove the old engine

Add a small global animation stylesheet, imported once, with reusable transition
classes for trip sharing, route content, and stationary chrome. Use selectors
such as `::view-transition-group(.vt-trip-card)` rather than selectors coupled
to generated names. Keep durations short and provide reduced-motion overrides.
Check browser support for class selectors and permit default/no animation where
custom styling is unavailable. Disable unwanted root cross-fading so excluded
chrome and portals do not flash as part of the document snapshot.

Once the router proof and boundary migration work together, remove:

- `document.startViewTransition`, transition-only `flushSync`, `pendingTransition`,
  skip/finished-promise handling, and `[VT]` logs from `App.tsx`.
- Inline `viewTransitionName`/`viewTransitionClass` assignments and CSS
  `view-transition-name` declarations across the inventory above.
- The floating-indicator name selectors and unused macroplan name helper.

Retain the shared-trip identity helper because it expresses an actual matching
relationship. Replace its trivial string-only test with useful shared-boundary
and navigation coverage. Never rerun navigation because an animation fails.

## Verification and delivery

1. Commit the router proof and adapter first, gated off until the React boundary
   migration lands. Exercise nested routes, `~` targets, replace/state, queries,
   fragments, direct history updates, Back/Forward, auth redirects, and rapid
   navigation. Assert a single intended history action and coherent consumers.
2. Migrate trip sharing, content, chrome, and map boundaries together with removal
   of the native engine. Do not run both engines for the same navigation. Use a
   rollout flag to disable animations while keeping navigation functional.
3. Run focused Vitest tests for route policy, adapter state/history behavior,
   dialog cleanup, and duplicate shared identities. Run typecheck and a production
   build with the locked React 19.3 dependencies. JSDOM assertions alone cannot
   establish that animations run correctly.
4. In real Chromium, Firefox, and Safari, check card-to-trip and return navigation,
   active/archived lists, each trip section, public links, map views, and nested
   dialogs. Test cold chunks, slow/erroring data, interrupted transitions, scroll,
   focus, reduced motion, hidden tabs, and missing browser API support. Back/Forward
   without animation is expected in the first release; lost restoration is not.
5. Confirm no duplicate-name errors, double navigation, root flashes, stuck
   spinners, Radix blinking, stale dialog modes, or lost form state. Verify drag
   and periodic trip sync remain responsive and unanimated.
6. Search the final code for manual DOM transition names and native capture calls;
   only React shared `name` props and class-based animation CSS should remain.
   Expand to other interactions only after this navigation migration is proven.

This plan is independent of the earlier offline-support proposal. No service
worker, offline storage, or offline-mode implementation is part of this work.
